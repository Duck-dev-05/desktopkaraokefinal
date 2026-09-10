@echo off
REM Karaoke Pro - Windows Setup Script
REM This script helps set up the development environment for Windows

echo 🎤 Karaoke Pro - Development Environment Setup
echo ==============================================
echo.

REM Check if Rust is installed
where rustc >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Rust is already installed
    rustc --version
) else (
    echo 📦 Installing Rust...
    echo Please visit https://rustup.rs/ to install Rust
    echo After installation, restart your terminal and run this script again
    pause
    exit /b 1
)

echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js is already installed
    node --version
) else (
    echo 📦 Installing Node.js...
    echo Please visit https://nodejs.org/ to install Node.js
    echo After installation, restart your terminal and run this script again
    pause
    exit /b 1
)

echo.

REM Check if Visual Studio Build Tools are installed
where cl >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Visual Studio Build Tools are already installed
) else (
    echo ⚠️  Visual Studio Build Tools may not be installed
    echo Please install them from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo Select "Desktop development with C++" workload
    echo.
    echo Press any key to continue anyway (build may fail)...
    pause >nul
)

echo.

REM Install npm dependencies
echo 📦 Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)
echo ✅ npm dependencies installed successfully

echo.

REM Check for external binaries
echo 📦 Checking for external binaries (ffmpeg, yt-dlp)...

where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ ffmpeg is already installed
) else (
    echo ⚠️  ffmpeg not found in PATH
    echo Please download from: https://github.com/BtbN/FFmpeg-Builds/releases
    echo Download ffmpeg-master-latest-win64-gpl.zip and add to PATH
)

echo.

where yt-dlp >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ yt-dlp is already installed
) else (
    echo ⚠️  yt-dlp not found in PATH
    echo Please download from: https://github.com/yt-dlp/yt-dlp/releases/latest
    echo Download yt-dlp.exe and add to PATH
)

echo.
echo 🎉 Setup completed!
echo.
echo You can now run the development server:
echo   npm run tauri dev
echo.
echo Or build for production:
echo   npm run tauri build
echo.
echo Don't forget to create a .env file with your API keys!
echo.
pause