import { Mic, Volume2, Monitor, RefreshCw, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useUpdaterContext } from "../components/Updater";
import { getVersion } from "@tauri-apps/api/app";
import { useSettings } from "../context/SettingsContext";
import { useEffect, useState } from "react";
import CustomSelect from "../components/CustomSelect";
import "./Settings.css";

const Settings = () => {
  const { audioOffset, setAudioOffset } = usePlayer();
  const { state: updateState, checkUpdates, installUpdate } = useUpdaterContext();
  const { settings, updateSettings } = useSettings();
  const [appVersion, setAppVersion] = useState<string>("");
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);

    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
        setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
      } catch (err) {
        console.error("Error fetching media devices:", err);
      }
    };

    fetchDevices();
    navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
    };
  }, []);

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
              <CustomSelect
                options={audioInputs.length > 0 ? audioInputs.map((device, idx) => ({
                  value: device.deviceId,
                  label: device.label || `Microphone ${idx + 1}`
                })) : [{ value: "default", label: "Mặc định hệ thống" }]}
                value={settings.micDevice || 'default'}
                onChange={(val) => updateSettings({ micDevice: val })}
              />
            </div>
            <div className="setting-row">
              <label>Âm lượng đầu vào (Gain)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mic size={16} className="text-muted" />
                <input
                  type="range"
                  className="settings-slider"
                  min="0"
                  max="100"
                  value={settings.micGain}
                  onChange={(e) => updateSettings({ micGain: parseInt(e.target.value) })}
                  style={{ width: '200px' }}
                />
                <span className="font-mono text-sm text-primary" style={{ width: '36px', textAlign: 'right' }}>{settings.micGain}%</span>
              </div>
            </div>
            <div className="setting-row">
              <label>Khử Tiếng Ồn</label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => updateSettings({ noiseSuppression: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={16} color="var(--primary)" />
                  Đồng bộ Âm thanh (Audio Latency Calibration)
                </label>
                <span className="text-primary font-mono" style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>
                  {audioOffset > 0 ? `+${audioOffset}` : audioOffset}ms
                </span>
              </div>
              <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
                Điều chỉnh nếu giọng hát của bạn bị trễ (lag) so với nhạc nền. (Thường để -50ms đến -200ms với tai nghe Bluetooth).
              </p>
              <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '16px' }}>
                <span className="text-xs text-muted font-mono" style={{ width: '46px', textAlign: 'right' }}>-500ms</span>
                <input
                  type="range"
                  className="settings-slider"
                  min="-500"
                  max="500"
                  step="10"
                  value={audioOffset}
                  onChange={(e) => setAudioOffset(parseInt(e.target.value))}
                  style={{ flex: 1, maxWidth: 'none' }}
                />
                <span className="text-xs text-muted font-mono" style={{ width: '46px' }}>+500ms</span>
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
              <CustomSelect
                options={audioOutputs.length > 0 ? audioOutputs.map((device, idx) => ({
                  value: device.deviceId,
                  label: device.label || `Speaker ${idx + 1}`
                })) : [{ value: "default", label: "Mặc định hệ thống" }]}
                value={settings.outputDevice || 'default'}
                onChange={(val) => updateSettings({ outputDevice: val })}
              />
            </div>
            <div className="setting-row">
              <label>Âm lượng Tổng</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Volume2 size={16} className="text-muted" />
                <input
                  type="range"
                  className="settings-slider"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => updateSettings({ masterVolume: parseInt(e.target.value) })}
                  style={{ width: '200px' }}
                />
                <span className="font-mono text-sm text-primary" style={{ width: '36px', textAlign: 'right' }}>{settings.masterVolume}%</span>
              </div>
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
              <CustomSelect
                options={[
                  { value: "1080p", label: "1080p (Chất lượng Cao)" },
                  { value: "720p", label: "720p (Tiêu chuẩn)" },
                  { value: "480p", label: "480p (Tiết kiệm Dữ liệu)" }
                ]}
                value={settings.videoQuality}
                onChange={(val) => updateSettings({ videoQuality: val })}
              />
            </div>
            <div className="setting-row">
              <label>Hiển thị Video Nền</label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showBackgroundVideo}
                  onChange={(e) => updateSettings({ showBackgroundVideo: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="setting-row">
              <label>Đồng bộ Lời bài hát</label>
              <CustomSelect
                options={[
                  { value: "smooth", label: "Chuyển động mượt mà" },
                  { value: "word", label: "Từng chữ một" }
                ]}
                value={settings.lyricsSync}
                onChange={(val) => updateSettings({ lyricsSync: val })}
              />
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
                <span className="setting-row-desc">Karaoke Pro v{appVersion || "..."}</span>
              </div>

              {/* ── Dynamic Update Button ── */}
              {(updateState.status === "idle" || updateState.status === "up-to-date") && (
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

              {updateState.status === "github-available" && (
                <button
                  className="update-btn update-btn--available"
                  onClick={() => {
                    import("@tauri-apps/plugin-opener").then(({ openUrl }) => {
                      openUrl((updateState as any).url);
                    });
                  }}
                >
                  <Download size={15} />
                  Tải từ GitHub v{(updateState as any).version}
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
            {updateState.status === "up-to-date" && (
              <p className="text-sm" style={{ color: "var(--success, #4ade80)", marginTop: 4 }}>
                <CheckCircle2 size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                Ứng dụng đang ở phiên bản mới nhất.
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
            {updateState.status === "github-available" && (
              <p className="text-sm" style={{ color: "var(--primary, #a855f7)", marginTop: 4 }}>
                📦 Có phiên bản mới trên GitHub! Vui lòng tải thủ công.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
