use yt_dlp::YoutubeDl;

fn main() {
    println!("Fetching...");
    match YoutubeDl::new("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
        .extract_audio(true)
        .run()
    {
        Ok(output) => {
            if let Some(video) = output.into_single_video() {
                println!("Success! Extracted ID: {:?}", video.id);
            } else {
                println!("No video found.");
            }
        }
        Err(e) => println!("Error: {:?}", e),
    }
}
