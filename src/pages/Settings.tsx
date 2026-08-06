import { Mic, Volume2, Monitor, RefreshCw, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { usePlayer } from "../context/PlayerContext";
import { useUpdaterContext } from "../components/Updater";
import { getVersion } from "@tauri-apps/api/app";
import { useSettings } from "../context/SettingsContext";
import { useEffect, useRef, useState } from "react";
import CustomSelect from "../components/CustomSelect";
import "./Settings.css";

// ── Nav section definitions ──────────────────────────────────
const NAV_SECTIONS = [
  { id: "audio-input",  label: "Đầu Vào Âm Thanh", icon: Mic },
  { id: "audio-output", label: "Đầu Ra Âm Thanh",  icon: Volume2 },
  { id: "video",        label: "Video & Hiển Thị",  icon: Monitor },
  { id: "updates",      label: "Cập Nhật",           icon: RefreshCw },
] as const;

const Settings = () => {
  const { audioOffset, setAudioOffset } = usePlayer();
  const { state: updateState, checkUpdates, installUpdate } = useUpdaterContext();
  const { settings, updateSettings } = useSettings();

  const [appVersion, setAppVersion] = useState<string>("");
  const [audioInputs,  setAudioInputs]  = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [activeSection, setActiveSection] = useState<string>("audio-input");

  // Section refs for scroll-spy
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    getVersion().then(setAppVersion).catch(console.error);

    const fetchDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter(d => d.kind === "audioinput"));
        setAudioOutputs(devices.filter(d => d.kind === "audiooutput"));
      } catch (err) {
        console.error("Error fetching media devices:", err);
      }
    };

    fetchDevices();
    navigator.mediaDevices.addEventListener("devicechange", fetchDevices);
    return () => navigator.mediaDevices.removeEventListener("devicechange", fetchDevices);
  }, []);

  // Scroll-spy: update active nav item when scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  const hasUpdate = updateState.status === "available" || updateState.status === "github-available";

  return (
    <div className="settings-page animate-fade-in">
      {/* ── Page Header ── */}
      <header className="page-header">
        <h1>Cài Đặt</h1>
        <p className="text-muted">Cấu hình trải nghiệm karaoke của bạn.</p>
      </header>

      {/* ── Left Navigation ── */}
      <nav className="settings-nav">
        <div className="settings-nav-title">Danh mục</div>
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`settings-nav-item${activeSection === id ? " active" : ""}`}
            onClick={() => scrollToSection(id)}
          >
            <Icon size={16} />
            {label}
            {id === "updates" && hasUpdate && (
              <span className="settings-nav-badge">MỚI</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Settings Sections ── */}
      <div className="settings-container">

        {/* ── Audio Input ──────────────────────────── */}
        <section
          id="audio-input"
          ref={(el) => { sectionRefs.current["audio-input"] = el; }}
          className="settings-section glass"
        >
          <div className="section-title">
            <div className="section-title-icon"><Mic size={20} /></div>
            <h2>Đầu Vào Âm Thanh</h2>
          </div>

          <div className="settings-content">
            {/* Microphone Device */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Thiết bị Micro</span>
                <span className="setting-row-desc">Chọn microphone để thu âm giọng hát.</span>
              </div>
              <CustomSelect
                options={audioInputs.length > 0
                  ? audioInputs.map((device, idx) => ({ value: device.deviceId, label: device.label || `Microphone ${idx + 1}` }))
                  : [{ value: "default", label: "Mặc định hệ thống" }]
                }
                value={settings.micDevice || "default"}
                onChange={(val) => updateSettings({ micDevice: val })}
              />
            </div>

            {/* Mic Gain slider */}
            <div className="setting-row setting-row--slider">
              <div className="setting-row-top">
                <div className="setting-row-info">
                  <span className="setting-row-label">Âm lượng đầu vào (Gain)</span>
                  <span className="setting-row-desc">Khuếch đại tín hiệu microphone trước khi xử lý.</span>
                </div>
                <span className="setting-row-value">{settings.micGain}%</span>
              </div>
              <div className="slider-track-wrap">
                <span className="slider-endpoint">0%</span>
                <input
                  type="range"
                  className="settings-slider"
                  min="0" max="150"
                  value={settings.micGain}
                  onChange={(e) => updateSettings({ micGain: parseInt(e.target.value) })}
                />
                <span className="slider-endpoint slider-endpoint--right">150%</span>
              </div>
            </div>

            {/* Noise Suppression */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Khử Tiếng Ồn</span>
                <span className="setting-row-desc">Lọc tiếng ồn môi trường xung quanh.</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.noiseSuppression}
                  onChange={(e) => updateSettings({ noiseSuppression: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Audio Latency Calibration */}
            <div className="setting-subsection">
              <div className="setting-subsection-label">
                <RefreshCw size={13} />
                Đồng bộ Âm thanh — Latency Calibration
              </div>
              <div className="settings-content">
                <div className="setting-row setting-row--slider">
                  <div className="setting-row-top">
                    <div className="setting-row-info">
                      <span className="setting-row-label">Độ trễ Âm thanh</span>
                      <span className="setting-row-desc">
                        Điều chỉnh nếu giọng hát bị trễ so với nhạc nền.
                        Bluetooth thường cần −50ms đến −200ms.
                      </span>
                    </div>
                    <span className="setting-row-value">
                      {audioOffset > 0 ? `+${audioOffset}` : audioOffset}ms
                    </span>
                  </div>
                  <div className="slider-track-wrap">
                    <span className="slider-endpoint">−500ms</span>
                    <input
                      type="range"
                      className="settings-slider"
                      min="-500" max="500" step="10"
                      value={audioOffset}
                      onChange={(e) => setAudioOffset(parseInt(e.target.value))}
                    />
                    <span className="slider-endpoint slider-endpoint--right">+500ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Audio Output ──────────────────────────── */}
        <section
          id="audio-output"
          ref={(el) => { sectionRefs.current["audio-output"] = el; }}
          className="settings-section glass"
        >
          <div className="section-title">
            <div className="section-title-icon"><Volume2 size={20} /></div>
            <h2>Đầu Ra Âm Thanh</h2>
          </div>

          <div className="settings-content">
            {/* Output Device */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Thiết bị Đầu ra</span>
                <span className="setting-row-desc">Loa hoặc tai nghe để phát nhạc và giọng hát.</span>
              </div>
              <CustomSelect
                options={audioOutputs.length > 0
                  ? audioOutputs.map((device, idx) => ({ value: device.deviceId, label: device.label || `Speaker ${idx + 1}` }))
                  : [{ value: "default", label: "Mặc định hệ thống" }]
                }
                value={settings.outputDevice || "default"}
                onChange={(val) => updateSettings({ outputDevice: val })}
              />
            </div>

            {/* Master Volume slider */}
            <div className="setting-row setting-row--slider">
              <div className="setting-row-top">
                <div className="setting-row-info">
                  <span className="setting-row-label">Âm lượng Tổng</span>
                  <span className="setting-row-desc">Âm lượng phát lại chính của ứng dụng.</span>
                </div>
                <span className="setting-row-value">{settings.masterVolume}%</span>
              </div>
              <div className="slider-track-wrap">
                <span className="slider-endpoint">0%</span>
                <input
                  type="range"
                  className="settings-slider"
                  min="0" max="150"
                  value={settings.masterVolume}
                  onChange={(e) => updateSettings({ masterVolume: parseInt(e.target.value) })}
                />
                <span className="slider-endpoint slider-endpoint--right">150%</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Video & Display ───────────────────────── */}
        <section
          id="video"
          ref={(el) => { sectionRefs.current["video"] = el; }}
          className="settings-section glass"
        >
          <div className="section-title">
            <div className="section-title-icon"><Monitor size={20} /></div>
            <h2>Video &amp; Hiển Thị</h2>
          </div>

          <div className="settings-content">
            {/* Video Quality */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Chất lượng Video</span>
                <span className="setting-row-desc">Độ phân giải phát video YouTube karaoke.</span>
              </div>
              <CustomSelect
                options={[
                  { value: "1080p", label: "1080p — Chất lượng Cao" },
                  { value: "720p",  label: "720p — Tiêu chuẩn" },
                  { value: "480p",  label: "480p — Tiết kiệm Dữ liệu" },
                ]}
                value={settings.videoQuality}
                onChange={(val) => updateSettings({ videoQuality: val })}
              />
            </div>

            {/* Background Video */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Hiển thị Video Nền</span>
                <span className="setting-row-desc">Phát video nền động trong khi hát karaoke.</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.showBackgroundVideo}
                  onChange={(e) => updateSettings({ showBackgroundVideo: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Lyrics Sync */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Đồng bộ Lời bài hát</span>
                <span className="setting-row-desc">Kiểu hiển thị và chuyển đổi lời theo nhịp nhạc.</span>
              </div>
              <CustomSelect
                options={[
                  { value: "smooth", label: "Chuyển động mượt mà" },
                  { value: "word",   label: "Từng chữ một" },
                ]}
                value={settings.lyricsSync}
                onChange={(val) => updateSettings({ lyricsSync: val })}
              />
            </div>
          </div>
        </section>

        {/* ── App Updates ───────────────────────────── */}
        <section
          id="updates"
          ref={(el) => { sectionRefs.current["updates"] = el; }}
          className="settings-section glass"
        >
          <div className="section-title">
            <div className="section-title-icon"><RefreshCw size={20} /></div>
            <h2>Cập Nhật Ứng Dụng</h2>
          </div>

          <div className="settings-content">
            {/* Auto-update toggle */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Tự động cài đặt cập nhật</span>
                <span className="setting-row-desc">Cài bản cập nhật tự động khi khởi động ứng dụng.</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoUpdate}
                  onChange={(e) => updateSettings({ autoUpdate: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Current version + update action */}
            <div className="setting-row">
              <div className="setting-row-info">
                <span className="setting-row-label">Phiên bản hiện tại</span>
                <span className="setting-row-desc">
                  <span className="version-badge">Karaoke Pro v{appVersion || "…"}</span>
                </span>
              </div>

              {(updateState.status === "idle" || updateState.status === "up-to-date") && (
                <button
                  id="check-updates-btn"
                  className="update-btn update-btn--idle"
                  onClick={() => checkUpdates(true)}
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
                  onClick={() => openUrl((updateState as any).url)}
                >
                  <Download size={15} />
                  Tải xuống v{(updateState as any).version}
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
                  onClick={() => checkUpdates(true)}
                >
                  <AlertCircle size={15} />
                  Thử lại
                </button>
              )}
            </div>

            {/* Status messages */}
            {updateState.status === "idle" && (
              <p className="update-status update-status--muted">
                Ứng dụng tự động kiểm tra cập nhật khi khởi động.
              </p>
            )}
            {updateState.status === "up-to-date" && (
              <p className="update-status update-status--success">
                <CheckCircle2 size={14} />
                Ứng dụng đang ở phiên bản mới nhất.
              </p>
            )}
            {updateState.status === "available" && (
              <p className="update-status update-status--success">
                <CheckCircle2 size={14} />
                Có bản cập nhật mới sẵn sàng để cài đặt!
              </p>
            )}
            {updateState.status === "github-available" && (
              <p className="update-status update-status--info">
                📦 Có phiên bản mới trên GitHub! Vui lòng tải thủ công.
              </p>
            )}
            {updateState.status === "error" && (
              <p className="update-status update-status--error">
                <AlertCircle size={14} />
                {(updateState as any).message}
              </p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
