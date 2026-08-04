# Contributing to Karaoke Pro

Thank you for your interest in contributing! Here's how to get started.

---

## Prerequisites

Before you begin, install the following:

| Tool | Version | Link |
|---|---|---|
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Rust (stable) | latest | [rustup.rs](https://rustup.rs/) |
| Git | any | [git-scm.com](https://git-scm.com/) |
| Tauri prerequisites | – | [tauri.app/guides](https://tauri.app/v1/guides/getting-started/prerequisites) |

> **Windows users** also need [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/Duck-dev-05/karaokedesktop.git
cd karaokedesktop
```

### 2. Set up environment variables

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and fill in your own API keys. See `.env.example` for instructions on where to get each key.

### 3. Set up sidecar binaries

The app requires `ffmpeg` and `yt-dlp` as sidecar executables in `src-tauri/`.

**On Windows (PowerShell):**
```powershell
# FFmpeg
$ffmpeg = node -e "const f = require('ffmpeg-static'); process.stdout.write(f)"
Copy-Item $ffmpeg "src-tauri/ffmpeg-x86_64-pc-windows-msvc.exe"

# yt-dlp
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "src-tauri/yt-dlp-x86_64-pc-windows-msvc.exe"
```

**On macOS (Apple Silicon):**
```bash
# FFmpeg
cp $(node -e "const f = require('ffmpeg-static'); process.stdout.write(f)") src-tauri/ffmpeg-aarch64-apple-darwin
chmod +x src-tauri/ffmpeg-aarch64-apple-darwin

# yt-dlp
curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos" -o src-tauri/yt-dlp-aarch64-apple-darwin
chmod +x src-tauri/yt-dlp-aarch64-apple-darwin
```

### 4. Install dependencies

```bash
npm install
```

### 5. Run in development mode

```bash
npm run tauri dev
```

This starts the Vite dev server and opens the Tauri desktop window with hot-reload.

---

## Project Structure

```
karaokedesktop/
├── src/                  # React frontend
│   ├── api/              # API call functions
│   ├── components/       # Reusable UI components
│   ├── context/          # React context providers
│   ├── hooks/            # Custom React hooks
│   ├── layouts/          # Page layout wrappers
│   ├── pages/            # Full page components
│   └── db.ts             # Local SQLite database helpers
├── src-tauri/            # Rust backend (Tauri)
│   ├── src/              # Rust source files
│   ├── capabilities/     # Tauri security permissions
│   ├── icons/            # App icons
│   ├── tauri.conf.json   # Main Tauri configuration
│   ├── Cargo.toml        # Rust dependencies
│   └── installer-hooks.nsh  # NSIS installer customization
├── .github/workflows/    # GitHub Actions CI/CD
├── .env.example          # Environment variable template
├── CHANGELOG.md          # Version history
└── SECURITY.md           # Security policy
```

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code |
| `dev` | Active development branch |
| `feature/your-feature` | New features |
| `fix/issue-description` | Bug fixes |

---

## Submitting Changes

1. **Fork** the repository and create your branch from `dev`.
2. Make your changes, following the existing code style.
3. Test your changes locally with `npm run tauri dev`.
4. Commit with a clear, descriptive message:
   ```
   feat: add vocal pitch correction slider
   fix: resolve YouTube API quota rotation bug
   docs: update CONTRIBUTING guide
   ```
5. Push your branch and open a **Pull Request** against the `dev` branch.
6. Fill in the PR template describing what you changed and why.

---

## Releasing a New Version

Only maintainers can create releases. To trigger the release pipeline:

1. Update `version` in `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml`.
2. Update `CHANGELOG.md` with the new version's changes.
3. Commit: `git commit -m "chore: bump version to v0.x.x"`
4. Tag: `git tag v0.x.x`
5. Push: `git push origin main --tags`

GitHub Actions will automatically build and publish installers for **Windows**, **macOS**, and **Linux**.
