# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ Active |

---

## Reporting a Vulnerability

If you discover a security vulnerability in Karaoke Pro, please **do NOT open a public GitHub Issue**. Instead, follow the responsible disclosure process below.

### How to Report

1. **Email**: Contact the maintainer directly at the email address on the [GitHub profile](https://github.com/Duck-dev-05).
2. **Include the following information**:
   - A clear description of the vulnerability.
   - Steps to reproduce the issue.
   - The potential impact and severity.
   - Any suggested fix, if you have one.

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days** for critical issues.

---

## Environment & API Keys

> [!CAUTION]
> **Never commit your `.env` file to version control.** The `.env` file contains real API keys (Google OAuth, YouTube, Stripe) that should remain private.

- The `.env` file is listed in `.gitignore` and should remain excluded from all commits.
- Use `.env.example` as the safe, committable template — it only contains placeholder values.
- All API keys are provided to the application via **GitHub Actions Secrets** during the release build process. They are baked into the frontend at compile time by Vite and are **not** shipped as a file inside the installer.

---

## Security Best Practices for Contributors

- Keep all dependencies up to date. Run `npm audit` and `cargo audit` regularly.
- Do not introduce new `eval()` calls or disable Tauri's Content Security Policy without review.
- All Tauri capabilities are explicitly declared in `src-tauri/capabilities/default.json`. Do not add overly broad permissions.
- External binaries (`ffmpeg`, `yt-dlp`) are sidecar executables verified by Tauri's bundle system.
