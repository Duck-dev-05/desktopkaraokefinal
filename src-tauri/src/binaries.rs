// Binary helper module for handling external binaries across platforms
use std::path::PathBuf;
use std::env;
use std::process::Command;

pub fn get_ffmpeg_path() -> Option<PathBuf> {
    find_binary("ffmpeg")
}

pub fn get_yt_dlp_path() -> Option<PathBuf> {
    find_binary("yt-dlp")
}

fn find_binary(name: &str) -> Option<PathBuf> {
    // First check if binary is in the same directory as the executable
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let bin_path = exe_dir.join(if cfg!(windows) {
                format!("{}.exe", name)
            } else {
                name.to_string()
            });
            
            if bin_path.exists() {
                return Some(bin_path);
            }
        }
    }
    
    // Check system PATH
    if let Ok(path) = env::var("PATH") {
        for dir in env::split_paths(&path) {
            let bin_path = dir.join(if cfg!(windows) {
                format!("{}.exe", name)
            } else {
                name.to_string()
            });
            
            if bin_path.exists() {
                return Some(bin_path);
            }
        }
    }
    
    // Check common installation paths
    let common_paths = if cfg!(windows) {
        vec![
            PathBuf::from(r"C:\Program Files\ffmpeg\bin"),
            PathBuf::from(r"C:\ffmpeg\bin"),
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/opt/homebrew/bin"),
            PathBuf::from("/usr/bin"),
        ]
    } else {
        vec![
            PathBuf::from("/usr/local/bin"),
            PathBuf::from("/usr/bin"),
            PathBuf::from("/snap/bin"),
        ]
    };
    
    for dir in common_paths {
        let bin_path = dir.join(if cfg!(windows) {
            format!("{}.exe", name)
        } else {
            name.to_string()
        });
        
        if bin_path.exists() {
            return Some(bin_path);
        }
    }
    
    None
}

pub fn check_binary_availability() -> (bool, bool) {
    let ffmpeg_available = get_ffmpeg_path().is_some();
    let yt_dlp_available = get_yt_dlp_path().is_some();
    (ffmpeg_available, yt_dlp_available)
}

pub fn install_instructions() -> &'static str {
    if cfg!(windows) {
        r#"
For Windows users:
1. Download ffmpeg from https://github.com/BtbN/FFmpeg-Builds/releases
2. Download yt-dlp from https://github.com/yt-dlp/yt-dlp/releases/latest
3. Place them in the same folder as Karaoke Pro.exe
4. Or add them to your system PATH
"#
    } else if cfg!(target_os = "macos") {
        r#"
For macOS users:
Run: brew install ffmpeg yt-dlp
Or download manually and place in /usr/local/bin/
"#
    } else {
        r#"
For Linux users:
Ubuntu/Debian: sudo apt install ffmpeg yt-dlp
Fedora/RHEL: sudo dnf install ffmpeg yt-dlp
Or: pip install yt-dlp
"#
    }
}