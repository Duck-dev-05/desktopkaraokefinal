import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { openUrl } from "@tauri-apps/plugin-opener";
import { getVersion } from "@tauri-apps/api/app";
import { useSettings } from "../context/SettingsContext";
type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: Update; isManual: boolean }
  | { status: "downloading"; progress: number }
  | { status: "installing" }
  | { status: "error"; message: string }
  | { status: "up-to-date" };

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
  return "Kiểm tra cập nhật thất bại. Vui lòng thử lại.";
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

      if (isNoReleaseError(err)) {
        setState({ status: "up-to-date" });
      } else if (isManual) {
        setState({ status: "error", message: friendlyError(err) });
      } else {
        setState({ status: "idle" });
      }
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

  return { state, checkUpdates, installUpdate, setState };
}

// ────────────────────────────────────────────────────────────────────
// Main component – mounts globally in App.tsx for automatic checks
// ────────────────────────────────────────────────────────────────────
export default function Updater({ manual = false, onDismiss }: UpdaterProps) {
  const { state, checkUpdates, installUpdate, setState } = useUpdaterContext();
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

  // Auto install if enabled (only applies to Tauri updater)
  useEffect(() => {
    if (settings.autoUpdate && state.status === "available") {
      installUpdate(state.update, state.isManual);
    }
  }, [settings.autoUpdate, state, installUpdate]);

  // Nothing to show while idle / checking silently / up-to-date
  if (state.status === "idle" || state.status === "checking" || state.status === "up-to-date") return null;

  // If autoUpdate is enabled and it's a background check, hide the UI for normal updater flow
  if (!manual && settings.autoUpdate && (state.status === "available" || state.status === "downloading" || state.status === "installing")) {
    return null;
  }

  const dismiss = () => {
    setState({ status: "idle" });
    onDismiss?.();
  };

  return (
    <div className="updater-overlay" role="dialog" aria-modal="true" aria-label="App update">
      <div className="updater-card glass">
        {/* ── Update available ── */}
        {state.status === "available" && (
          <>
            <div className="updater-icon">🚀</div>
            <h2 className="updater-title">Có bản cập nhật mới!</h2>
            <p className="updater-body">
              Phiên bản <strong>{state.update.version}</strong> đã sẵn sàng.
              Cập nhật ngay để tận hưởng tính năng mới và cải tiến.
            </p>
            {state.update.body && (
              <pre className="updater-notes">{state.update.body}</pre>
            )}
            <div className="updater-actions">
              <button className="btn-secondary" onClick={dismiss}>
                Nhắc sau
              </button>
              <button
                className="btn-primary"
                onClick={() => installUpdate(state.update, true)}
              >
                Cập nhật ngay
              </button>
            </div>
          </>
        )}



        {/* ── Downloading ── */}
        {state.status === "downloading" && (
          <>
            <div className="updater-icon">⬇️</div>
            <h2 className="updater-title">Đang tải xuống…</h2>
            <div className="updater-progress-track">
              <div
                className="updater-progress-fill"
                style={{ width: `${state.progress}%` }}
              />
            </div>
            <p className="updater-body">{state.progress}%</p>
          </>
        )}

        {/* ── Installing ── */}
        {state.status === "installing" && (
          <>
            <div className="updater-icon">⚙️</div>
            <h2 className="updater-title">Đang cài đặt…</h2>
            <p className="updater-body">
              Ứng dụng sẽ tự động khởi động lại ngay bây giờ.
            </p>
          </>
        )}

        {/* ── Error ── */}
        {state.status === "error" && (
          <>
            <div className="updater-icon">⚠️</div>
            <h2 className="updater-title">Lỗi cập nhật</h2>
            <p className="updater-body">{state.message}</p>
            <div className="updater-actions">
              <button className="btn-secondary" onClick={dismiss}>
                Đóng
              </button>
              <button className="btn-primary" onClick={() => checkUpdates(true)}>
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
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          animation: fadeIn 0.25s ease;
        }
        .updater-card {
          width: min(440px, 90vw);
          padding: 2rem;
          border-radius: 20px;
          text-align: center;
          background: rgba(20, 20, 35, 0.92);
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .updater-icon { font-size: 3rem; margin-bottom: 0.75rem; }
        .updater-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.5rem;
        }
        .updater-body {
          color: rgba(255,255,255,0.65);
          font-size: 0.95rem;
          line-height: 1.6;
          margin: 0 0 1.25rem;
        }
        .updater-notes {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.5);
          white-space: pre-wrap;
          max-height: 120px;
          overflow-y: auto;
          margin-bottom: 1.25rem;
        }
        .updater-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }
        .updater-progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .updater-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary, #a855f7), #ec4899);
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95) }
          to   { opacity: 1; transform: translateY(0)   scale(1)    }
        }
      `}</style>
    </div>
  );
}
