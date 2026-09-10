# Karaoke Pro - Desktop Karaoke Application

A feature-rich desktop karaoke application with YouTube streaming, Party mode, Peer-to-Peer connectivity, local media support, and more.

## � Features

- **YouTube Karaoke Integration**: Stream and sing along to millions of songs
- **Party Mode**: Sing with friends in real-time with peer-to-peer connectivity
- **Local Media Support**: Play your own audio and video files
- **Recording**: Record your performances and share them
- **Modern Clean UI**: Beautiful, responsive interface with smooth animations
- **Cross-Platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm**
- **Rust** (for Tauri desktop app)
- **Platform-specific dependencies** (see below)

### Platform-Specific Setup

#### Windows
```bash
# Install Rust
# Visit https://rustup.rs/ for installation instructions

# Install Visual Studio Build Tools
# Required for Tauri on Windows

# Clone and install
git clone https://github.com/Duck-dev-05/desktopkaraokefinal.git
cd desktopkaraokefinal
npm install
npm run tauri dev
```

#### macOS
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required dependencies
brew install webkit2gtk

# Clone and install
git clone https://github.com/Duck-dev-05/desktopkaraokefinal.git
cd desktopkaraokefinal
npm install
npm run tauri dev
```

#### Linux (Ubuntu/Debian)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install required dependencies (minimal set for better compatibility)
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev \
    libgtk-3-0 \
    build-essential \
    curl \
    wget \
    libssl-dev

# Clone and install
git clone https://github.com/Duck-dev-05/desktopkaraokefinal.git
cd desktopkaraokefinal
npm install
npm run tauri dev
```

#### Linux (Fedora/RHEL)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install required dependencies (minimal set for better compatibility)
sudo dnf install -y webkit2gtk4.1-devel \
    gtk3 \
    openssl-devel \
    curl \
    wget \
    file

# Clone and install
git clone https://github.com/Duck-dev-05/desktopkaraokefinal.git
cd desktopkaraokefinal
npm install
npm run tauri dev
```

## 📦 External Binaries

The application requires `ffmpeg` and `yt-dlp` for video downloading and processing. These need to be installed separately:

### Windows
```bash
# Download ffmpeg
# Visit: https://github.com/BtbN/FFmpeg-Builds/releases
# Download ffmpeg-master-latest-win64-gpl.zip
# Extract and add to PATH

# Download yt-dlp
# Visit: https://github.com/yt-dlp/yt-dlp/releases/latest
# Download yt-dlp.exe
# Add to PATH
```

### macOS
```bash
# Install using Homebrew
brew install ffmpeg yt-dlp
```

### Linux
```bash
# Ubuntu/Debian
sudo apt install -y ffmpeg yt-dlp

# Fedora/RHEL
sudo dnf install -y ffmpeg yt-dlp

# Or using pip
pip install yt-dlp
```

## 🔧 Configuration

Create a `.env` file in the root directory:

```env
# YouTube API Key (required for YouTube features)
YOUTUBE_API_KEY=your_api_key_here

# Stripe (for premium features)
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# OAuth (if using OAuth authentication)
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
```

## 🏗️ Building

### Development
```bash
npm run tauri dev
```

### Production Build
```bash
# Build for current platform
npm run build:prod

# Build for specific platform
npm run build:windows    # Windows installer
npm run build:macos      # macOS DMG
npm run build:linux      # Linux packages

# Build for all platforms
npm run build:all
```

Build artifacts will be in `src-tauri/target/release/bundle/`

For detailed production build instructions, see [BUILD_GUIDE.md](BUILD_GUIDE.md)

## 🎨 UI Design

The application features a modern clean design with:
- Light theme with blue accents
- Minimalist aesthetic
- Smooth animations
- Responsive layout
- Glass morphism effects

## 📁 Project Structure

```
desktopkaraokefinal/
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── pages/            # Page components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom hooks
│   └── api/              # API calls
├── src-tauri/            # Rust backend
│   ├── src/              # Rust source code
│   ├── Cargo.toml        # Rust dependencies
│   └── tauri.conf.json   # Tauri configuration
├── public/               # Static assets
└── scripts/              # Build scripts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [React](https://reactjs.org/)
- Icons by [Lucide](https://lucide.dev/)

## 🐛 Troubleshooting

### Common Issues

**Build fails on macOS:**
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Check that Rust is properly installed: `rustc --version`

**Build fails on Linux:**
- Install all required dependencies for your distribution
- Check that webkit2gtk is installed: `webkit2gtk-4.1 --version`

**External binaries not found:**
- Ensure ffmpeg and yt-dlp are in your system PATH
- Check permissions on Linux/macOS: `chmod +x /path/to/binary`

**YouTube API not working:**
- Verify your YouTube API key is valid
- Check that the API key has the necessary permissions
- Ensure the `.env` file is properly configured

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Refer to Tauri documentation: https://tauri.app/v1/guides/