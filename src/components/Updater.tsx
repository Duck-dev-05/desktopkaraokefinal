import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";
import { useSettings } from "../context/SettingsContext";
import { Rocket, Package, ArrowDownToLine, Loader2, AlertTriangle, X } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: Update; isManual: boolean }
  | { status: "downloading"; progress: number }
  | { status: "installing" }
  | { status: "error"; message: string }
  | { status: "up-to-date" }
  | { status: "github-available"; version: string; url: string }
  | { status: "github-ready"; version: string; url: string; body: string };

interface UpdaterProps {
  /** If true, shows feedback even when no update is available (used from Settings) */
  manual?: boolean;
  onDismiss?: () => void;
}

interface UpdaterContextValue {
  state: UpdaterState;
  checkUpdates: (isManual?: boolean) => void;
  installUpdate: (update: Update, shouldRelaunch?: boolean) => void;
  setState: React.Dispatch<React.SetStateAction<UpdaterState>>;
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

export function useUpdaterContext() {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error("useUpdaterContext must be used within UpdaterProvider");
  }
  return context;
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const updaterHook = useCheckForUpdates();
  return (
    <UpdaterContext.Provider value={updaterHook}>
      {children}
    </UpdaterContext.Provider>
  );
}

/** Returns a friendly Vietnamese message for known updater errors */
function friendlyError(err: unknown): string {
  const raw = String(err).toLowerCase();
  if (
    raw.includes("could not fetch a valid release json") ||
    raw.includes("release json") ||
    raw.includes("404") ||
    raw.includes("not found") ||
    raw.includes("failed to fetch")
  ) {
    return "Không thể kết nối đến máy chủ cập nhật. Vui lòng thử lại sau.";
  }
  if (raw.includes("network") || raw.includes("internet") || raw.includes("connection")) {
    return "Mất kết nối mạng. Hãy kiểm tra internet và thử lại.";
  }
  return `Cập nhật thất bại. Vui lòng thử lại. Lỗi: ${String(err)}`;
}

/** Returns true for errors that mean "no releases published yet" or unreachable server */
function isNoReleaseError(err: unknown): boolean {
  const raw = String(err).toLowerCase();
  return (
    raw.includes("could not fetch a valid release json") ||
    raw.includes("release json") ||
    raw.includes("404") ||
    raw.includes("not found")
  );
}

export function useCheckForUpdates() {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });

  const checkUpdates = useCallback(async (isManual = true) => {
    setState({ status: "checking" });
    try {
      const update = await check();
      if (update?.available) {
        setState({ status: "available", update, isManual });
      } else {
        setState({ status: "up-to-date" });
      }
    } catch (err) {
      console.error("Update check failed:", err);

      try {
        const res = await fetch("https://api.github.com/repos/Duck-dev-05/desktopkaraokefinal/releases/latest");
        if (res.ok) {
          const data = await res.json();
          const tagVersion = data.tag_name.replace(/^v/, "");
          const currentVersion = await getVersion();

          const cmp = (a: string, b: string) => {
            const pa = a.split('.').map(Number);
            const pb = b.split('.').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
              if ((pa[i] || 0) > (pb[i] || 0)) return 1;
              if ((pa[i] || 0) < (pb[i] || 0)) return -1;
            }
            return 0;
          };

          if (cmp(tagVersion, currentVersion) > 0) {
            const winAsset = data.assets.find((a: any) => a.name.endsWith('.exe'));
            const dlUrl = winAsset ? winAsset.browser_download_url : data.html_url;

            if (winAsset) {
              setState({ status: "github-ready", version: tagVersion, url: dlUrl, body: data.body });
            } else {
              setState({ status: "github-available", version: tagVersion, url: dlUrl });
            }
            return;
          }
        }
      } catch (githubErr) {
        console.error("Github fallback check failed", githubErr);
      }
      setState({ status: "up-to-date" });
    }
  }, []);

  const installUpdate = useCallback(async (update: Update, shouldRelaunch = true) => {
    let downloaded = 0;
    let total = 0;
    setState({ status: "downloading", progress: 0 });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          setState({ status: "downloading", progress: pct });
        } else if (event.event === "Finished") {
          setState({ status: "installing" });
        }
      });
      if (shouldRelaunch) {
        await relaunch();
      } else {
        setState({ status: "idle" });
      }
    } catch (err) {
      setState({ status: "error", message: friendlyError(err) });
    }
  }, []);

  const installGithubUpdate = useCallback(async (url: string) => {
    setState({ status: "downloading", progress: 0 });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen<{ progress: number }>("download-progress", (event) => {
        setState({ status: "downloading", progress: event.payload.progress });
      });
      await invoke("download_and_install_update", { url });
      setState({ status: "installing" });
      unlisten();
    } catch (e) {
      setState({ status: "error", message: friendlyError(e) });
    }
  }, []);

  return { state, checkUpdates, installUpdate, installGithubUpdate, setState };
}

// ────────────────────────────────────────────────────────────────────
// Main component – mounts globally in App.tsx for automatic checks
// ────────────────────────────────────────────────────────────────────
export default function Updater({ manual = false, onDismiss }: UpdaterProps) {
  const { state, checkUpdates, installUpdate, installGithubUpdate, setState } = useUpdaterContext();
  const hasAutoChecked = useRef(false);
  const { settings } = useSettings();

  // Automatic check on mount (delayed slightly so app can finish loading)
  useEffect(() => {
    if (!manual && !hasAutoChecked.current) {
      hasAutoChecked.current = true;
      const timer = setTimeout(() => checkUpdates(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [manual, checkUpdates]);

  // Manual check – fire immediately when prop flips
  useEffect(() => {
    if (manual) checkUpdates(true);
  }, [manual, checkUpdates]);

  // Removed auto-install behavior, now it just relies on the user clicking the button to open the link

  // Nothing to show while idle / checking silently / up-to-date
  if (state.status === "idle" || state.status === "checking" || state.status === "up-to-date") return null;



  const dismiss = () => {
    setState({ status: "idle" });
    onDismiss?.();
  };

  return (
    <div className="updater-overlay" role="dialog" aria-modal="true" aria-label="App update">
      <div className="updater-card">
        <button className="updater-close-btn" onClick={dismiss} aria-label="Close">
          <X size={20} />
        </button>

        {/* ── Update available ── */}
        {state.status === "available" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow"></div>
              <Rocket className="updater-icon text-primary" size={40} />
            </div>
            <h2 className="updater-title">Có bản cập nhật mới!</h2>
            <p className="updater-body">
              Phiên bản <strong>{state.update.version}</strong> đã sẵn sàng.
              Cập nhật ngay để tận hưởng tính năng mới và cải tiến.
            </p>
            {state.update.body && (
              <div className="updater-notes markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {state.update.body}
                </ReactMarkdown>
              </div>
            )}
            <div className="updater-actions">
              <button className="btn-secondary updater-btn" onClick={dismiss}>
                Nhắc sau
              </button>
              <button
                className="btn-primary updater-btn"
                onClick={() => {
                  openUrl("https://github.com/Duck-dev-05/desktopkaraokefinal/releases/latest");
                  dismiss();
                }}
              >
                Tải xuống ngay
              </button>
            </div>
          </>
        )}

        {/* ── GitHub Update ready to install ── */}
        {state.status === "github-ready" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow"></div>
              <Rocket className="updater-icon text-primary" size={40} />
            </div>
            <h2 className="updater-title">Có bản cập nhật mới!</h2>
            <p className="updater-body">
              Phiên bản <strong>{state.version}</strong> đã sẵn sàng.
              Cập nhật ngay để tận hưởng tính năng mới và cải tiến.
            </p>
            {state.body && (
              <div className="updater-notes markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {state.body}
                </ReactMarkdown>
              </div>
            )}
            <div className="updater-actions">
              <button className="btn-secondary updater-btn" onClick={dismiss}>
                Nhắc sau
              </button>
              <button
                className="btn-primary updater-btn"
                onClick={() => {
                  openUrl(state.url);
                  dismiss();
                }}
              >
                Tải xuống ngay
              </button>
            </div>
          </>
        )}

        {/* ── GitHub Update available (no direct dl) ── */}
        {state.status === "github-available" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow"></div>
              <Package className="updater-icon text-primary" size={40} />
            </div>
            <h2 className="updater-title">Có bản cập nhật mới!</h2>
            <p className="updater-body">
              Phiên bản <strong>{state.version}</strong> đã được phát hành trên GitHub.
              Vui lòng tải xuống và cài đặt thủ công.
            </p>
            <div className="updater-actions">
              <button className="btn-secondary updater-btn" onClick={dismiss}>
                Nhắc sau
              </button>
              <button
                className="btn-primary updater-btn"
                onClick={() => {
                  openUrl(state.url);
                  dismiss();
                }}
              >
                Mở GitHub
              </button>
            </div>
          </>
        )}

        {/* ── Downloading ── */}
        {state.status === "downloading" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow"></div>
              <ArrowDownToLine className="updater-icon text-accent animate-bounce" size={40} />
            </div>
            <h2 className="updater-title">Đang tải xuống…</h2>
            <div className="updater-progress-track">
              <div
                className="updater-progress-fill"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="updater-body" style={{ marginTop: '0.75rem', fontWeight: 600 }}>{state.progress}%</p>
          </>
        )}

        {/* ── Installing ── */}
        {state.status === "installing" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow"></div>
              <Loader2 className="updater-icon text-primary animate-spin" size={40} />
            </div>
            <h2 className="updater-title">Đang cài đặt…</h2>
            <p className="updater-body">
              Ứng dụng sẽ tự động khởi động lại ngay bây giờ.
            </p>
          </>
        )}

        {/* ── Error ── */}
        {state.status === "error" && (
          <>
            <div className="updater-icon-wrapper">
              <div className="updater-icon-glow error-glow"></div>
              <AlertTriangle className="updater-icon text-danger" size={40} />
            </div>
            <h2 className="updater-title">Lỗi cập nhật</h2>
            <p className="updater-body">{state.message}</p>
            <div className="updater-actions">
              <button className="btn-secondary updater-btn" onClick={dismiss}>
                Đóng
              </button>
              <button className="btn-primary updater-btn" onClick={() => checkUpdates(true)}>
                Thử lại
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .updater-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(6, 4, 12, 0.75);
          backdrop-filter: blur(16px);
          animation: overlayFadeIn 0.3s ease-out;
        }
        
        .updater-card {
          position: relative;
          width: min(460px, 92vw);
          padding: 2.5rem 2rem;
          border-radius: 24px;
          text-align: center;
          background: linear-gradient(145deg, rgba(19, 16, 38, 0.95), rgba(12, 10, 24, 0.98));
          border: 1px solid rgba(168, 85, 247, 0.25);
          box-shadow: 0 0 80px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: cardSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }

        .updater-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 150px;
          background: radial-gradient(circle at 50% -20%, rgba(168, 85, 247, 0.15), transparent 70%);
          pointer-events: none;
        }

        .updater-close-btn {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          z-index: 10;
        }

        .updater-close-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .updater-icon-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .updater-icon-glow {
          position: absolute;
          inset: 0;
          background: var(--primary);
          border-radius: 50%;
          filter: blur(24px);
          opacity: 0.4;
          animation: pulseGlow 2.5s infinite alternate;
        }
        
        .error-glow {
          background: var(--danger);
        }

        .updater-icon {
          position: relative;
          z-index: 1;
        }
        
        .text-primary { color: var(--primary-hover); }
        .text-accent { color: var(--accent-hover); }
        .text-danger { color: #f87171; }

        .updater-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.75rem;
          letter-spacing: -0.02em;
        }

        .updater-body {
          color: var(--text-secondary);
          font-size: 1.05rem;
          line-height: 1.6;
          margin: 0 0 1.5rem;
        }

        .updater-notes {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
          font-size: 0.9rem;
          color: var(--text-secondary);
          max-height: 200px;
          overflow-y: auto;
          margin-bottom: 1.75rem;
          box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 10px 0; }
        .markdown-body th, .markdown-body td { border: 1px solid rgba(255,255,255,0.1); padding: 6px; text-align: left; }
        .markdown-body img { vertical-align: middle; }
        .markdown-body a { color: var(--primary); text-decoration: none; }
        .markdown-body p { margin-bottom: 8px; }
        .markdown-body ul, .markdown-body ol { margin-left: 20px; margin-bottom: 8px; }
        .markdown-body code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 4px; font-family: monospace; }
        
        /* Custom scrollbar for notes */
        .updater-notes::-webkit-scrollbar { width: 6px; }
        .updater-notes::-webkit-scrollbar-track { background: transparent; }
        .updater-notes::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .updater-notes::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

        .updater-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }
        
        .updater-btn {
          flex: 1;
          padding: 0.75rem 1.5rem;
          font-weight: 600;
          font-size: 1rem;
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .updater-progress-track {
          width: 100%;
          height: 12px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 0.5rem;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
        }

        .updater-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary), var(--secondary));
          border-radius: 999px;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .updater-progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: translateX(-100%);
          animation: shimmer 1.5s infinite;
        }

        .animate-spin { animation: spin 2s linear infinite; }
        .animate-bounce { animation: bounce 1s infinite alternate; }

        @keyframes overlayFadeIn { 
          from { opacity: 0; backdrop-filter: blur(0px); } 
          to { opacity: 1; backdrop-filter: blur(16px); } 
        }
        
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes pulseGlow {
          from { opacity: 0.3; transform: scale(0.8); }
          to { opacity: 0.6; transform: scale(1.1); }
        }
        
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes bounce { 
          from { transform: translateY(-4px); } 
          to { transform: translateY(4px); } 
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
