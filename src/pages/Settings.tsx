import { Mic, Volume2, Monitor, RefreshCw, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useCheckForUpdates } from "../components/Updater";
import "./Settings.css";

const Settings = () => {
  const { audioOffset, setAudioOffset } = usePlayer();
  const { state: updateState, checkUpdates, installUpdate } = useCheckForUpdates();
  const handleCheckUpdates = () => {
    checkUpdates(true);
  };

  return (
    <div className="settings-page animate-fade-in">
      <header className="page-header">
        <h1>Cài Đặt</h1>
        <p className="text-muted">Cấu hình trải nghiệm karaoke của bạn.</p>
      </header>

      <div className="settings-container">
        <section className="settings-section glass">
          <div className="section-title">
            <Mic size={24} color="var(--primary)" />
            <h2>Đầu Vào Âm Thanh</h2>
          </div>
          <div className="settings-content">
            <div className="setting-row">
              <label>Thiết bị Micro</label>
              <select className="settings-select">
                <option>Default - MacBook Pro Microphone</option>
                <option>External USB Mic (Shure SM7B)</option>
                <option>AirPods Pro</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Âm lượng đầu vào (Gain)</label>
              <input type="range" className="settings-slider" defaultValue="75" />
            </div>
            <div className="setting-row">
              <label>Khử Tiếng Ồn</label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} color="var(--primary)" />
                  Đồng bộ Âm thanh (Audio Latency Calibration)
                </label>
                <span className="text-primary font-mono">{audioOffset > 0 ? `+${audioOffset}` : audioOffset}ms</span>
              </div>
              <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
                Điều chỉnh nếu giọng hát của bạn bị trễ (lag) so với nhạc nền. (Thường để -50ms đến -200ms với tai nghe Bluetooth).
              </p>
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '16px' }}>
                <span className="text-xs text-muted">-500ms</span>
                <input 
                  type="range" 
                  className="settings-slider" 
                  min="-500" 
                  max="500" 
                  step="10"
                  value={audioOffset}
                  onChange={(e) => setAudioOffset(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span className="text-xs text-muted">+500ms</span>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section glass">
          <div className="section-title">
            <Volume2 size={24} color="var(--primary)" />
            <h2>Đầu Ra Âm Thanh</h2>
          </div>
          <div className="settings-content">
            <div className="setting-row">
              <label>Thiết bị Đầu ra</label>
              <select className="settings-select">
                <option>Default - Built-in Speakers</option>
                <option>Studio Monitors (Scarlett 2i2)</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Âm lượng Tổng</label>
              <input type="range" className="settings-slider" defaultValue="100" />
            </div>
          </div>
        </section>

        <section className="settings-section glass">
          <div className="section-title">
            <Monitor size={24} color="var(--primary)" />
            <h2>Video & Hiển Thị</h2>
          </div>
          <div className="settings-content">
            <div className="setting-row">
              <label>Chất lượng Video</label>
              <select className="settings-select">
                <option>1080p (Chất lượng Cao)</option>
                <option>720p (Tiêu chuẩn)</option>
                <option>480p (Tiết kiệm Dữ liệu)</option>
              </select>
            </div>
            <div className="setting-row">
              <label>Hiển thị Video Nền</label>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-row">
              <label>Đồng bộ Lời bài hát</label>
              <select className="settings-select">
                <option>Chuyển động mượt mà</option>
                <option>Từng chữ một</option>
              </select>
            </div>
          </div>
        </section>

        {/* ── App Updates ── */}
        <section className="settings-section glass">
          <div className="section-title">
            <RefreshCw size={24} color="var(--primary)" />
            <h2>Cập Nhật Ứng Dụng</h2>
          </div>
          <div className="settings-content">
            <div className="setting-row">
              <div className="setting-row-label">
                <label>Phiên bản hiện tại</label>
                <span className="setting-row-desc">Karaoke Pro v0.1.0</span>
              </div>

              {/* ── Dynamic Update Button ── */}
              {updateState.status === "idle" && (
                <button
                  id="check-updates-btn"
                  className="update-btn update-btn--idle"
                  onClick={handleCheckUpdates}
                >
                  <RefreshCw size={15} />
                  Kiểm tra cập nhật
                </button>
              )}

              {updateState.status === "checking" && (
                <button className="update-btn update-btn--checking" disabled>
                  <Loader2 size={15} className="spin" />
                  Đang kiểm tra…
                </button>
              )}

              {updateState.status === "available" && (
                <button
                  id="install-update-btn"
                  className="update-btn update-btn--available"
                  onClick={() => installUpdate((updateState as any).update)}
                >
                  <Download size={15} />
                  Cập nhật v{(updateState as any).update?.version}
                </button>
              )}

              {updateState.status === "downloading" && (
                <div className="update-progress-inline">
                  <div className="update-progress-bar">
                    <div
                      className="update-progress-fill"
                      style={{ width: `${(updateState as any).progress}%` }}
                    />
                  </div>
                  <span className="update-pct">{(updateState as any).progress}%</span>
                </div>
              )}

              {updateState.status === "installing" && (
                <button className="update-btn update-btn--checking" disabled>
                  <Loader2 size={15} className="spin" />
                  Đang cài đặt…
                </button>
              )}

              {updateState.status === "error" && (
                <button
                  className="update-btn update-btn--error"
                  onClick={handleCheckUpdates}
                >
                  <AlertCircle size={15} />
                  Thử lại
                </button>
              )}
            </div>

            {/* Status hint row */}
            {updateState.status === "idle" && (
              <p className="text-muted text-sm" style={{ marginTop: 4 }}>
                Ứng dụng tự động kiểm tra cập nhật khi khởi động.
              </p>
            )}
            {updateState.status === "error" && (
              <p className="text-sm" style={{ color: "var(--error, #f87171)", marginTop: 4 }}>
                <AlertCircle size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {(updateState as any).message}
              </p>
            )}
            {updateState.status === "available" && (
              <p className="text-sm" style={{ color: "var(--success, #4ade80)", marginTop: 4 }}>
                <CheckCircle2 size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Có bản cập nhật mới sẵn sàng để cài đặt!
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
