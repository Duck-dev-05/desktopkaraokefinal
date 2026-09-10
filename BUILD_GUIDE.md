# Production Build Guide

This guide explains how to build production-ready installers for Karaoke Pro across different platforms.

## 🏗️ Building for Production

### Prerequisites

Before building for production, ensure you have:

1. **Rust toolchain** installed for your target platform
2. **Platform-specific build tools**:
   - **Windows**: Visual Studio Build Tools
   - **macOS**: Xcode Command Line Tools
   - **Linux**: GTK and webkit development libraries

3. **Code signing certificates** (for signed releases, optional):
   - **Windows**: Authenticode certificate
   - **macOS**: Apple Developer certificate
   - **Linux**: GPG key for package signing

### Quick Build Commands

#### Build for Current Platform
```bash
npm run build:prod
```

#### Build for Specific Platform
```bash
# Windows
npm run build:windows

# macOS
npm run build:macos

# Linux
npm run build:linux
```

#### Build for All Platforms
```bash
npm run build:all
```

## 📦 Platform-Specific Build Instructions

### Windows

#### Prerequisites
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Select "Desktop development with C++" workload
```

#### Build Process
```bash
npm run build:windows
```

#### Output Location
```
src-tauri/target/release/bundle/nsis/
├── Karaoke Pro_1.8.1_x64-setup.exe        # Main installer
└── Karaoke Pro_1.8.1_x64-setup.exe.sig    # Signature (if signed)
```

#### Installer Features
- User can choose installation directory
- Creates desktop shortcut
- Creates Start Menu entry
- Automatic updates enabled
- Clean uninstall with configuration preservation

#### Windows Store (Optional)
To build for Microsoft Store:
```bash
npm run tauri build --target msix
```

### macOS

#### Prerequisites
```bash
# Install Xcode Command Line Tools
xcode-select --install

# For code signing, you need:
# - Apple Developer account
# - Signing certificate in Keychain
```

#### Build Process
```bash
npm run build:macos
```

#### Output Location
```
src-tauri/target/release/bundle/dmg/
└── Karaoke Pro_1.8.1_x64.dmg              # Disk image installer

src-tauri/target/release/bundle/macos/
└── Karaoke Pro.app                         # Application bundle
```

#### DMG Features
- Drag-and-drop installation
- Automatic code signing (if certificate provided)
- Notarization support for macOS 10.15+
- Spacemsgs support

#### Code Signing (Optional)
```bash
# Add signing identity to tauri.conf.json:
"macOS": {
  "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
  "hardenedRuntime": true
}
```

#### Notarization (Optional)
For distribution outside Mac App Store:
```bash
# Notarize the DMG
xcrun notarytool submit "Karaoke Pro_1.8.1_x64.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAM_ID" \
  --wait
```

### Linux

#### Prerequisites
```bash
# Ubuntu/Debian (minimal dependencies for better compatibility)
sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-0 build-essential curl wget libssl-dev

# Fedora/RHEL (minimal dependencies for better compatibility)
sudo dnf install -y webkit2gtk4.1-devel gtk3 openssl-devel curl wget file

# Arch Linux
sudo pacman -S webkit2gtk base-devel curl wget file openssl
```

#### Build Process
```bash
npm run build:linux
```

#### Output Location
```
src-tauri/target/release/bundle/deb/
└── karaoke-pro_1.8.1_amd64.deb            # Debian/Ubuntu package

src-tauri/target/release/bundle/appimage/
└── karaoke-pro_1.8.1_amd64.AppImage        # Universal Linux package

src-tauri/target/release/bundle/rpm/
└── karaoke-pro-1.8.1.x86_64.rpm          # Fedora/RHEL package
```

#### Package Formats

**DEB (Debian/Ubuntu)**
- System integration with package manager
- Automatic dependency resolution
- Desktop entry creation
- Menu integration

**AppImage (Universal)**
- Works on most Linux distributions
- No installation required
- Portable and self-contained
- Run with: `./karaoke-pro_1.8.1_amd64.AppImage`

**RPM (Fedora/RHEL)**
- Native package manager integration
- Dependency management
- System service integration

## 🔐 Code Signing

### Windows Code Signing
```bash
# Sign the installer
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com "Karaoke Pro_1.8.1_x64-setup.exe"
```

### macOS Code Signing
```bash
# Sign the app bundle
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" "Karaoke Pro.app"

# Create DMG
hdiutil create -volname "Karaoke Pro" -srcfolder "Karaoke Pro.app" -ov -format UDZO "Karaoke Pro.dmg"
```

### Linux Package Signing
```bash
# Sign DEB package
dpkg-sig --sign builder karaoke-pro_1.8.1_amd64.deb

# Sign RPM package
rpmsign --addsign karaoke-pro-1.8.1.x86_64.rpm
```

## 🚀 Distribution

### GitHub Releases
1. Create a new release on GitHub
2. Upload platform-specific installers
3. Update `latest.json` for auto-updater
4. Include checksums for verification

### Auto-Updater Configuration
The app includes built-in auto-updater. Update the configuration in `tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "pubkey": "your-public-key",
    "endpoints": [
      "https://github.com/YOUR_USERNAME/desktopkaraokefinal/releases/latest/download/latest.json"
    ]
  }
}
```

### Platform-Specific Distribution

**Windows**
- GitHub Releases
- Microsoft Store (requires additional packaging)
- Direct download from website

**macOS**
- GitHub Releases
- Mac App Store (requires additional review process)
- Direct download from website

**Linux**
- GitHub Releases
- Flathub (Flatpak packaging)
- Snap Store (Snap packaging)
- Distribution repositories

## 🧪 Testing Production Builds

### Before Release
1. **Install the built package** on a clean system
2. **Test all major features**:
   - YouTube streaming
   - Download functionality
   - Local media playback
   - Party mode
   - Settings and configuration
3. **Test auto-updater** (if configured)
4. **Verify installation/uninstallation** process
5. **Check for any platform-specific issues**

### Cross-Platform Testing Matrix
| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Installation | ✅ | ✅ | ✅ |
| YouTube Streaming | ✅ | ✅ | ✅ |
| Downloads | ✅ | ✅ | ✅ |
| Local Media | ✅ | ✅ | ✅ |
| Party Mode | ✅ | ✅ | ✅ |
| Auto-Update | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |

## 🔧 Troubleshooting

### Build Failures

**Windows:**
- Ensure Visual Studio Build Tools are installed
- Check that Rust target is added: `rustup target add x86_64-pc-windows-msvc`
- Verify Webview2 is installed

**macOS:**
- Ensure Xcode Command Line Tools are installed
- Check code signing certificates (if signing)
- Verify minimum system version requirements

**Linux:**
- Install all required dependencies
- Check that GTK and webkit libraries are available
- Verify architecture compatibility

### Runtime Issues

**Missing external binaries:**
- The app will show installation instructions
- Users can install ffmpeg and yt-dlp separately
- Download features will be gracefully degraded

**Platform-specific quirks:**
- Test on multiple distributions for Linux
- Test on different macOS versions
- Test on different Windows versions

## 📋 Release Checklist

- [ ] All platform builds successful
- [ ] Code signing completed (if applicable)
- [ ] Installers tested on clean systems
- [ ] Auto-updater configuration verified
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Checksums generated
- [ ] GitHub release created
- [ ] Download links tested
- [ ] Support documentation updated

## 📞 Support

For build-related issues:
- Check Tauri documentation: https://tauri.app/
- Review platform-specific build guides
- Open an issue on GitHub with build logs