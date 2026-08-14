# Karaoke Desktop App

A modern, feature-rich desktop karaoke application built with **Tauri**, **React**, and **TypeScript**. 

This application leverages web technologies for a beautiful, responsive user interface while using Rust underneath for native desktop capabilities, high performance, and system-level integrations.

## 🎤 Key Features

- **YouTube Integration**: Stream karaoke tracks directly using `react-youtube`.
- **Audio Processing**: High-quality audio analysis and manipulation using `tone.js`.
- **Peer-to-Peer Connectivity**: Built-in support for remote controls or multiplayer features via `peerjs` and `react-qr-code`.
- **Media Processing**: Integrated `ffmpeg-static` for advanced media capabilities.
- **Native OS Integration**: Utilizes Tauri plugins for file system access, dialogs, logging, shell commands, and native window management.
- **Local Database**: Fast, reliable local storage using Tauri's SQL plugin.
- **Monetization**: Integrated Stripe payments for premium features.
- **OAuth Authentication**: Secure login flows via Tauri OAuth plugin.
- **Auto-Updates**: Built-in application updater ensuring you always have the latest version.

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, React Router, Lucide Icons
- **Backend/Core**: Tauri 2, Rust
- **Key Libraries**: Tone.js, PeerJS, Stripe, React YouTube

## 🛠️ Development Setup

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) for your specific operating system.

### Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development Mode**
   This will start the Vite dev server and open the Tauri desktop window.
   ```bash
   npm run tauri dev
   ```

3. **Build for Production**
   This will compile the frontend and package the Rust backend into an executable for your OS.
   ```bash
   npm run tauri build
   ```

## 📁 Project Structure

- `/src`: React frontend source code (components, hooks, styles)
- `/src-tauri`: Rust backend code and Tauri configuration
- `/public`: Static assets

## 📄 License

This project is licensed under the MIT License.
