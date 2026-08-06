mod signaling;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Mutex;
use std::thread;
use tiny_http::{Header, Response, Server};
use youtube_dl::YoutubeDl;

struct CacheState {
    cache: Mutex<HashMap<String, String>>,
}

use std::fs;
use std::process::Command;
use tauri::Manager;
use futures_util::StreamExt;
use tauri::Emitter;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    progress: u64,
}

#[tauri::command]
async fn download_and_install_update(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let total_size = res.content_length().unwrap_or(0);
    
    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("KaraokePro_Update.exe");
    let mut file = std::fs::File::create(&installer_path).map_err(|e| e.to_string())?;
    
    let mut downloaded = 0;
    let mut stream = res.bytes_stream();
    let mut last_percentage = 0;
    
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        use std::io::Write;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        
        if total_size > 0 {
            let percentage = ((downloaded as f64 / total_size as f64) * 100.0) as u64;
            if percentage > last_percentage {
                last_percentage = percentage;
                let _ = app.emit("download-progress", DownloadProgress { progress: percentage });
            }
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&installer_path)
            .arg("/S")
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    
    app.exit(0);
    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn download_video(app_handle: tauri::AppHandle, video_id: String) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let ytdlp_path = app_dir.join("yt-dlp.exe");
    if !ytdlp_path.exists() {
        return Err(
            "yt-dlp.exe not found. Please wait for initialization or restart the app.".into(),
        );
    }

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let downloads_dir = app_dir.join("downloads");
    if !downloads_dir.exists() {
        fs::create_dir_all(&downloads_dir).map_err(|e| e.to_string())?;
    }

    let url = format!("https://www.youtube.com/watch?v={}", video_id);
    let output_template = downloads_dir.join(format!("{}.%(ext)s", video_id));

    let output = Command::new(&ytdlp_path)
        .arg("-f")
        .arg("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best")
        .arg("-o")
        .arg(output_template.to_str().unwrap())
        .arg(&url)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Download failed: {}", err_msg));
    }

    // We try to return the path if we assume it downloaded as mp4,
    // otherwise we just return the directory.
    let expected_path = downloads_dir.join(format!("{}.mp4", video_id));
    if expected_path.exists() {
        Ok(expected_path.to_string_lossy().to_string())
    } else {
        Ok(downloads_dir
            .join(format!("{}.mkv", video_id))
            .to_string_lossy()
            .to_string())
    }
}

#[tauri::command]
async fn import_local_file(
    app_handle: tauri::AppHandle,
    source_path: String,
) -> Result<String, String> {
    let source_path = std::path::Path::new(&source_path);
    if !source_path.exists() {
        return Err("Source file does not exist".into());
    }

    let file_name = source_path
        .file_name()
        .ok_or_else(|| "Invalid file name".to_string())?;

    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let downloads_dir = app_dir.join("downloads");

    if !downloads_dir.exists() {
        fs::create_dir_all(&downloads_dir).map_err(|e| e.to_string())?;
    }

    let dest_path = downloads_dir.join(file_name);
    fs::copy(source_path, &dest_path).map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn save_audio_recording(
    app_handle: tauri::AppHandle,
    file_name: String,
    audio_data: Vec<u8>,
) -> Result<String, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let recordings_dir = app_dir.join("recordings");

    if !recordings_dir.exists() {
        fs::create_dir_all(&recordings_dir).map_err(|e| e.to_string())?;
    }

    let dest_path = recordings_dir.join(file_name);
    fs::write(&dest_path, audio_data).map_err(|e| e.to_string())?;

    Ok(dest_path.to_string_lossy().to_string())
}

fn start_proxy_server(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let server = match Server::http("127.0.0.1:15432") {
            Ok(s) => s,
            Err(e) => {
                println!("Failed to start proxy server: {}", e);
                return;
            }
        };
        let rt = tokio::runtime::Runtime::new().unwrap();

        let app_dir = app_handle.path().app_data_dir().unwrap();
        if !app_dir.exists() {
            std::fs::create_dir_all(&app_dir).unwrap();
        }
        let ytdlp_path = app_dir.join("yt-dlp.exe");
        if !ytdlp_path.exists() {
            println!("Downloading yt-dlp.exe to handle video streams...");
            let _ = rt.block_on(youtube_dl::download_yt_dlp(app_dir.to_str().unwrap()));
        }

        for mut request in server.incoming_requests() {
            let url = request.url().to_string();
            if url.starts_with("/suggest?q=") {
                let q = url.trim_start_matches("/suggest?q=");
                let suggest_url = format!(
                    "http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={}",
                    q
                );

                match reqwest::blocking::get(&suggest_url) {
                    Ok(response) => {
                        let text = response.text().unwrap_or_default();
                        let mut final_resp = Response::from_string(text);
                        final_resp.add_header(
                            Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                        );
                        final_resp.add_header(
                            Header::from_str("Content-Type: application/json").unwrap(),
                        );
                        let _ = request.respond(final_resp);
                    }
                    Err(_) => {
                        let mut resp = Response::empty(500);
                        resp.add_header(
                            Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                        );
                        let _ = request.respond(resp);
                    }
                }
                continue;
            }

            if url.starts_with("/chat/completions") {
                let mut body = String::new();
                if let Ok(_) = request.as_reader().read_to_string(&mut body) {
                    let client = reqwest::blocking::Client::new();
                    match client
                        .post("http://127.0.0.1:1234/v1/chat/completions")
                        .header("Content-Type", "application/json")
                        .body(body)
                        .send()
                    {
                        Ok(response) => {
                            let text = response.text().unwrap_or_default();
                            let mut final_resp = Response::from_string(text);
                            final_resp.add_header(
                                Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                            );
                            final_resp.add_header(
                                Header::from_str("Content-Type: application/json").unwrap(),
                            );
                            let _ = request.respond(final_resp);
                        }
                        Err(_) => {
                            let mut resp = Response::empty(500);
                            resp.add_header(
                                Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                            );
                            let _ = request.respond(resp);
                        }
                    }
                } else {
                    let mut resp = Response::empty(400);
                    resp.add_header(Header::from_str("Access-Control-Allow-Origin: *").unwrap());
                    let _ = request.respond(resp);
                }
                continue;
            }

            if url.starts_with("/stream?id=") {
                let id = url.trim_start_matches("/stream?id=");
                let video_url = format!("https://www.youtube.com/watch?v={}", id);

                let result = rt.block_on(async {
                    YoutubeDl::new(&video_url)
                        .youtube_dl_path(&ytdlp_path)
                        .extract_audio(true)
                        .run_async()
                        .await
                });

                let direct_url = match result {
                    Ok(output) => {
                        if let Some(video) = output.into_single_video() {
                            video.url
                        } else {
                            None
                        }
                    }
                    Err(e) => {
                        eprintln!("yt-dlp error: {:?}", e);
                        None
                    }
                };

                if let Some(stream_url) = direct_url {
                    // Extract Range header from incoming request
                    let mut range_header_val = None;
                    for h in request.headers() {
                        if h.field.as_str().as_str().eq_ignore_ascii_case("range") {
                            range_header_val = Some(h.value.as_str().to_string());
                        }
                    }

                    let client = reqwest::blocking::Client::new();
                    let mut req_builder = client.get(&stream_url);
                    if let Some(ref r) = range_header_val {
                        req_builder = req_builder.header("Range", r);
                    }

                    match req_builder.send() {
                        Ok(response) => {
                            let status = response.status().as_u16();
                            let size = response.content_length().map(|s| s as usize);
                            let content_type = response
                                .headers()
                                .get(reqwest::header::CONTENT_TYPE)
                                .and_then(|v| v.to_str().ok())
                                .unwrap_or("audio/webm")
                                .to_string();

                            let mut headers = vec![
                                Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                                Header::from_str(&format!("Content-Type: {}", content_type))
                                    .unwrap(),
                                Header::from_str("Accept-Ranges: bytes").unwrap(),
                            ];

                            // Forward Content-Range if it exists (for 206 responses)
                            if let Some(cr) = response.headers().get(reqwest::header::CONTENT_RANGE)
                            {
                                if let Ok(cr_str) = cr.to_str() {
                                    if let Ok(header) =
                                        Header::from_str(&format!("Content-Range: {}", cr_str))
                                    {
                                        headers.push(header);
                                    }
                                }
                            }

                            let final_resp = Response::new(
                                tiny_http::StatusCode(status),
                                headers,
                                response,
                                size,
                                None,
                            );
                            let _ = request.respond(final_resp);
                        }
                        Err(e) => {
                            eprintln!("reqwest fetch error: {:?}", e);
                            let mut resp = Response::empty(500);
                            resp.add_header(
                                Header::from_str("Access-Control-Allow-Origin: *").unwrap(),
                            );
                            let _ = request.respond(resp);
                        }
                    }
                } else {
                    let mut resp = Response::empty(500);
                    resp.add_header(Header::from_str("Access-Control-Allow-Origin: *").unwrap());
                    let _ = request.respond(resp);
                }
            } else {
                let mut resp = Response::empty(404);
                resp.add_header(Header::from_str("Access-Control-Allow-Origin: *").unwrap());
                let _ = request.respond(resp);
            }
        }
    });
}

use tauri_plugin_shell::ShellExt;

#[tauri::command]
async fn convert_media(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
    is_video: bool,
) -> Result<String, String> {
    let sidecar_command = app.shell().sidecar("ffmpeg").map_err(|e| e.to_string())?;

    let args = if is_video {
        vec![
            "-y".to_string(),
            "-i".to_string(),
            input_path.clone(),
            "-c:v".to_string(),
            "libx264".to_string(),
            "-c:a".to_string(),
            "aac".to_string(),
            output_path.clone(),
        ]
    } else {
        vec![
            "-y".to_string(),
            "-i".to_string(),
            input_path.clone(),
            "-vn".to_string(),
            "-ar".to_string(),
            "44100".to_string(),
            "-ac".to_string(),
            "2".to_string(),
            "-b:a".to_string(),
            "192k".to_string(),
            output_path.clone(),
        ]
    };

    // In tauri v2, output() is async
    let output = sidecar_command
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let _ = std::fs::remove_file(&input_path);
        Ok(output_path)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg failed: {}", err_msg))
    }
}

#[tauri::command]
async fn separate_vocals(app: tauri::AppHandle, input_path: String) -> Result<String, String> {
    let sidecar_command = app.shell().sidecar("ffmpeg").map_err(|e| e.to_string())?;

    let path = std::path::Path::new(&input_path);
    let ext = path.extension().unwrap_or_default().to_string_lossy();
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new(""));
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();

    let output_path = parent.join(format!("{}_instrumental.{}", stem, ext));

    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.clone(),
        "-af".to_string(),
        "pan=stereo|c0=c0-c1|c1=c0-c1".to_string(),
        output_path.to_string_lossy().to_string(),
    ];

    let output = sidecar_command
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(output_path.to_string_lossy().to_string())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg failed: {}", err_msg))
    }
}

#[tauri::command]
async fn merge_duet(
    app: tauri::AppHandle,
    original_path: String,
    new_vocal_path: String,
    output_filename: String,
) -> Result<String, String> {
    let sidecar_command = app.shell().sidecar("ffmpeg").map_err(|e| e.to_string())?;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let recordings_dir = app_dir.join("recordings");
    if !recordings_dir.exists() {
        std::fs::create_dir_all(&recordings_dir).map_err(|e| e.to_string())?;
    }
    let output_path = recordings_dir.join(output_filename);

    let args = vec![
        "-y".to_string(),
        "-i".to_string(),
        original_path,
        "-i".to_string(),
        new_vocal_path.clone(),
        "-filter_complex".to_string(),
        "amix=inputs=2:duration=longest".to_string(),
        output_path.to_string_lossy().to_string(),
    ];

    let output = sidecar_command
        .args(args)
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let _ = std::fs::remove_file(&new_vocal_path);
        Ok(output_path.to_string_lossy().to_string())
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFmpeg failed: {}", err_msg))
    }
}

#[tauri::command]
async fn ai_chat(prompt: String, system_prompt: String) -> Result<String, String> {
    // Check if an API key is provided
    let api_key = option_env!("GEMINI_API_KEY")
        .map(|s| s.to_string())
        .unwrap_or_else(|| std::env::var("GEMINI_API_KEY").unwrap_or_default());

    if api_key.is_empty() {
        return Err(
            "API Key missing. Vui lòng thiết lập biến môi trường GEMINI_API_KEY.".to_string(),
        );
    }

    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", api_key);

    let request_body = serde_json::json!({
        "contents": [
            {
                "parts": [
                    {"text": system_prompt},
                    {"text": prompt}
                ]
            }
        ]
    });

    let res = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(text) = json["candidates"][0]["content"]["parts"][0]["text"].as_str() {
            Ok(text.to_string())
        } else {
            Err("Invalid response format from Gemini API".to_string())
        }
    } else {
        let err_text = res.text().await.unwrap_or_default();
        Err(format!("Gemini API error: {}", err_text))
    }
}

#[tauri::command]
async fn search_youtube_cached(
    query: String,
    state: tauri::State<'_, CacheState>,
) -> Result<String, String> {
    {
        let cache = state.cache.lock().unwrap();
        if let Some(result) = cache.get(&query) {
            return Ok(result.clone());
        }
    }

    let api_keys_env = option_env!("VITE_YOUTUBE_API_KEY")
        .map(|s| s.to_string())
        .unwrap_or_else(|| std::env::var("VITE_YOUTUBE_API_KEY").unwrap_or_default());
    if api_keys_env.is_empty() {
        return Err("YouTube API key is missing".to_string());
    }
    
    let api_keys: Vec<&str> = api_keys_env.split(',').map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
    if api_keys.is_empty() {
        return Err("No valid YouTube API keys found".to_string());
    }

    let client = reqwest::Client::new();
    let mut last_error = String::new();

    for api_key in api_keys {
        let url = format!(
            "https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q={}&type=video&videoEmbeddable=true&key={}",
            urlencoding::encode(&query),
            urlencoding::encode(api_key)
        );
        let res = match client.get(&url).send().await {
            Ok(r) => r,
            Err(e) => {
                last_error = e.to_string();
                continue;
            }
        };

        if res.status().is_success() {
            let text = res.text().await.map_err(|e| e.to_string())?;
            let mut cache = state.cache.lock().unwrap();
            cache.insert(query, text.clone());
            return Ok(text);
        } else if res.status() == 403 {
            // Quota exceeded or forbidden, try next key
            last_error = format!("YouTube API 403 Forbidden with key");
            continue;
        } else {
            // Other errors
            last_error = format!("YouTube API error: {}", res.status());
            continue;
        }
    }

    Err(format!("All API keys failed. Last error: {}", last_error))
}

#[tauri::command]
async fn create_subscription(_price_id: String) -> Result<String, String> {
    let stripe_key = option_env!("STRIPE_SECRET_KEY")
        .map(|s| s.to_string())
        .unwrap_or_else(|| std::env::var("STRIPE_SECRET_KEY").unwrap_or_default());
    if stripe_key.is_empty() {
        return Err(
            "Stripe Key missing. Vui lòng thiết lập biến môi trường STRIPE_SECRET_KEY.".to_string(),
        );
    }

    // In a real app, you would:
    // 1. Create a Customer
    // 2. Create a Subscription
    // 3. Return the latest_invoice.payment_intent.client_secret
    // For simplicity, we just create a PaymentIntent here to demonstrate the flow.
    let client = reqwest::Client::new();
    let res = client
        .post("https://api.stripe.com/v1/payment_intents")
        .basic_auth(&stripe_key, Some(""))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("amount=999&currency=usd")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        if let Some(secret) = json["client_secret"].as_str() {
            Ok(secret.to_string())
        } else {
            Err("No client_secret in Stripe response".to_string())
        }
    } else {
        let err_text = res.text().await.unwrap_or_default();
        Err(format!("Stripe API error: {}", err_text))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    // Spawn WebRTC signaling server in a background thread
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            signaling::start_signaling_server(1421).await;
        });
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            start_proxy_server(app_handle);
            Ok(())
        })
        .manage(CacheState {
            cache: Default::default(),
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if window.label() == "main" {
                    // When main window is closed, exit the whole app
                    window.app_handle().exit(0);
                }
            }
        })
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            download_video,
            import_local_file,
            save_audio_recording,
            convert_media,
            ai_chat,
            search_youtube_cached,
            create_subscription,
            separate_vocals,
            merge_duet,
            download_and_install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
