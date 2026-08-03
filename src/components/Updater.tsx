import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/api/process";

type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: Update }
  | { status: "downloading"; progress: number }
  | { status: "installing" }
  | { status: "error"; message: string };

interface UpdaterProps {
  /** If true, shows feedback even when no update is available (used from Settings) */
  manual?: boolean;
  onDismiss?: () => void;
}

export function useCheckForUpdates() {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });

  const checkUpdates = async () => {
    setState({ status: "checking" });
    try {
      const update = await check();
      if (update?.available) {
        setState({ status: "available", update });
      } else {
        setState({ status: "idle" });
      }
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  };

  const installUpdate = async (update: Update) => {
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
      await relaunch();
    } catch (err) {
      setState({ status: "error", message: String(err) });
    }
  };

  return { state, checkUpdates, installUpdate, setState };
}

// ────────────────────────────────────────────────────────────────────
// Main component – mounts globally in App.tsx for automatic checks
// ────────────────────────────────────────────────────────────────────
export default function Updater({ manual = false, onDismiss }: UpdaterProps) {
  const { state, checkUpdates, installUpdate, setState } = useCheckForUpdates();

  // Automatic check on mount (delayed slightly so app can finish loading)
  useEffect(() => {
    if (!manual) {
      const timer = setTimeout(checkUpdates, 3000);
      return () => clearTimeout(timer);
    }
  }, [manual]);

  // Manual check – fire immediately when prop flips
  useEffect(() => {
    if (manual) checkUpdates();
  }, [manual]);

  // Nothing to show while idle / checking silently
  if (state.status === "idle" || state.status === "checking") return null;

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
                onClick={() => installUpdate(state.update)}
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
              <button className="btn-primary" onClick={checkUpdates}>
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
