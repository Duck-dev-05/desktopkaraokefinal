$ErrorActionPreference = "Stop"

$BinDir = "$PSScriptRoot\..\src-tauri\binaries"
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir | Out-Null
}

$Triple = "x86_64-pc-windows-msvc"

# Download yt-dlp
$YtdlpPath = "$BinDir\yt-dlp-$Triple.exe"
if (-not (Test-Path $YtdlpPath)) {
    Write-Host "Downloading yt-dlp..."
    Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile $YtdlpPath
} else {
    Write-Host "yt-dlp already exists."
}

# Download ffmpeg
$FfmpegPath = "$BinDir\ffmpeg-$Triple.exe"
if (-not (Test-Path $FfmpegPath)) {
    Write-Host "Downloading ffmpeg..."
    $TempZip = "$BinDir\ffmpeg.zip"
    Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile $TempZip
    Write-Host "Extracting ffmpeg..."
    Expand-Archive -Path $TempZip -DestinationPath $BinDir -Force
    $FfmpegExe = Get-ChildItem -Path $BinDir -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
    Move-Item -Path $FfmpegExe.FullName -Destination $FfmpegPath -Force
    # Clean up
    Remove-Item -Path $TempZip -Force
    Get-ChildItem -Path $BinDir -Directory -Filter "ffmpeg-master-latest-win64-gpl" | Remove-Item -Recurse -Force
} else {
    Write-Host "ffmpeg already exists."
}

Write-Host "Binaries downloaded successfully!"
