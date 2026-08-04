# Changelog

All notable changes to **Karaoke Pro** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Song lyrics synchronization (LRC file support)
- Pitch correction and vocal tuning
- Cloud playlist sync

---

## [0.1.0] – 2026-08-03

### 🎉 Initial Release

#### Added
- **YouTube Streaming** – Search and stream karaoke tracks directly from YouTube using the YouTube Data API v3.
- **Party Mode** – Host a karaoke party with Peer-to-Peer connectivity via PeerJS; guests can join via QR code scan.
- **Song Queue** – Add songs to a queue and manage playback order in real-time.
- **Playlists** – Create, manage, and save custom song playlists to a local SQLite database.
- **Download Manager** – Download tracks for offline use via integrated `yt-dlp`.
- **Local Media** – Play karaoke tracks from local files on your computer.
- **Recordings** – Record your singing sessions with audio capture and playback.
- **Google OAuth Login** – Secure sign-in with your Google account via Tauri OAuth plugin.
- **Premium Subscriptions** – Stripe-powered payment for Elite VIP and Premium Ticket tiers.
- **Profile Page** – Manage your account and subscription details.
- **Settings** – Configure audio, display, and app preferences.
- **Auto-Updater** – Automatically checks for and installs new versions from GitHub Releases.
- **History** – Browse previously played songs.
- **Explore** – Discover trending and featured karaoke content.

#### Technical
- Built with Tauri 2, React 19, TypeScript, and Vite.
- Native desktop integration via Tauri plugins (file system, dialog, shell, log, process).
- Local database storage using `tauri-plugin-sql` (SQLite).
- Audio processing powered by Tone.js.
- Cross-platform NSIS installer for Windows with custom hooks (OS version check, shortcuts, post-install launch).

---

[Unreleased]: https://github.com/Duck-dev-05/karaokedesktop/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Duck-dev-05/karaokedesktop/releases/tag/v0.1.0
