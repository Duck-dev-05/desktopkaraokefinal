#!/bin/bash

# Karaoke Pro - Cross-Platform Setup Script
# This script helps set up the development environment for macOS and Linux

set -e

echo "🎤 Karaoke Pro - Development Environment Setup"
echo "=============================================="

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

echo "Detected OS: $OS"
echo "Detected Architecture: $ARCH"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Rust
install_rust() {
    if command_exists rustc; then
        echo "✅ Rust is already installed"
        rustc --version
    else
        echo "📦 Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
        source $HOME/.cargo/env
        echo "✅ Rust installed successfully"
    fi
}

# Function to install Node.js
install_nodejs() {
    if command_exists node; then
        echo "✅ Node.js is already installed"
        node --version
    else
        echo "📦 Installing Node.js..."
        if [ "$OS" = "Darwin" ]; then
            # macOS
            if command_exists brew; then
                brew install node
            else
                echo "❌ Homebrew not found. Please install Homebrew first:"
                echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
        else
            # Linux
            if command_exists apt-get; then
                sudo apt-get update
                sudo apt-get install -y nodejs npm
            elif command_exists dnf; then
                sudo dnf install -y nodejs npm
            else
                echo "❌ Unable to install Node.js. Please install manually."
                exit 1
            fi
        fi
        echo "✅ Node.js installed successfully"
    fi
}

# Function to install platform-specific dependencies
install_platform_deps() {
    if [ "$OS" = "Darwin" ]; then
        echo "📦 Installing macOS dependencies..."
        
        # Check for Xcode Command Line Tools
        if ! command_exists xcode-select; then
            echo "📦 Installing Xcode Command Line Tools..."
            xcode-select --install
        else
            echo "✅ Xcode Command Line Tools already installed"
        fi
        
        # Install Homebrew if not present
        if ! command_exists brew; then
            echo "📦 Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install webkit2gtk and other dependencies
        echo "📦 Installing webkit2gtk and other dependencies..."
        brew install webkit2gtk
        
    elif [ "$OS" = "Linux" ]; then
        echo "📦 Installing Linux dependencies..."
        
        if command_exists apt-get; then
            # Ubuntu/Debian
            echo "📦 Installing Ubuntu/Debian dependencies..."
            sudo apt-get update
            sudo apt-get install -y \
                libwebkit2gtk-4.1-dev \
                libgtk-3-0 \
                build-essential \
                curl \
                wget \
                libssl-dev
                
        elif command_exists dnf; then
            # Fedora/RHEL
            echo "📦 Installing Fedora/RHEL dependencies..."
            sudo dnf install -y \
                webkit2gtk4.1-devel \
                gtk3 \
                openssl-devel \
                curl \
                wget \
                file
        else
            echo "⚠️  Unable to automatically install dependencies for your Linux distribution."
            echo "Please install the required dependencies manually."
        fi
    fi
}

# Function to install external binaries
install_external_binaries() {
    echo "📦 Installing external binaries (ffmpeg, yt-dlp)..."
    
    if [ "$OS" = "Darwin" ]; then
        # macOS
        if command_exists brew; then
            brew install ffmpeg yt-dlp
        else
            echo "⚠️  Homebrew not found. Please install ffmpeg and yt-dlp manually."
        fi
    elif [ "$OS" = "Linux" ]; then
        # Linux
        if command_exists apt-get; then
            sudo apt-get install -y ffmpeg yt-dlp
        elif command_exists dnf; then
            sudo dnf install -y ffmpeg yt-dlp
        elif command_exists pip3; then
            pip3 install yt-dlp
            sudo apt-get install -y ffmpeg || sudo dnf install -y ffmpeg
        else
            echo "⚠️  Unable to automatically install ffmpeg and yt-dlp."
            echo "Please install them manually."
        fi
    fi
    
    echo "✅ External binaries installation completed"
}

# Function to install npm dependencies
install_npm_deps() {
    echo "📦 Installing npm dependencies..."
    npm install
    echo "✅ npm dependencies installed successfully"
}

# Main setup process
main() {
    # Install Rust
    install_rust
    
    # Install Node.js
    install_nodejs
    
    # Install platform-specific dependencies
    install_platform_deps
    
    # Install external binaries
    install_external_binaries
    
    # Install npm dependencies
    install_npm_deps
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "You can now run the development server:"
    echo "  npm run tauri dev"
    echo ""
    echo "Or build for production:"
    echo "  npm run tauri build"
    echo ""
    echo "Don't forget to create a .env file with your API keys!"
}

# Run main function
main