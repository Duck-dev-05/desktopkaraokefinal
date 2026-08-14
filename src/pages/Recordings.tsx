import React, { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Play, Pause, X, Video, Clock, Calendar, Music2, Volume2, VolumeX } from "lucide-react";
import YouTube from "react-youtube";
import { convertFileSrc } from '@tauri-apps/api/core';
import { getAudioRecordings, AudioRecording } from "../db";
import "./Recordings.css";

/* ── Custom Audio/Video Player ── */
interface CustomPlayerProps {
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: (t: number) => void;
  autoPlay?: boolean;
}

const CustomPlayer: React.FC<CustomPlayerProps> = ({ src, onPlay, onPause, onSeeked, autoPlay }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
  };

  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="custom-player">
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        className="custom-player-video"
        onPlay={() => { setPlaying(true); onPlay?.(); }}
        onPause={() => { setPlaying(false); onPause?.(); }}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onSeeked={() => onSeeked?.(videoRef.current?.currentTime ?? 0)}
      />
      <div className="custom-player-controls">
        <button className="cp-play-btn" onClick={togglePlay}>
          {playing ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
        </button>
        <span className="cp-time">{fmt(currentTime)}</span>
        <div className="cp-progress-wrap">
          <div className="cp-progress-track">
            <div className="cp-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleProgress}
            className="cp-progress-input"
          />
        </div>
        <span className="cp-time">{fmt(duration)}</span>
        <button className="cp-vol-btn" onClick={() => setMuted(m => !m)}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const Recordings = () => {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [playingRecording, setPlayingRecording] = useState<AudioRecording | null>(null);

  useEffect(() => { loadRecordings(); }, []);

  const loadRecordings = async () => {
    try {
      const data = await getAudioRecordings();
      setRecordings(data);
    } catch (err) {
      console.error("Failed to load recordings", err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <div className="recordings-page animate-fade-in">

      {/* ── Hero ── */}
      <div className="rec-hero">
        <div className="rec-hero-glow" />
        <div className="rec-hero-left">
          <div className="rec-hero-icon"><Mic size={26} /></div>
          <div>
            <h1>Bản Thu Của Bạn</h1>
            <p>Xem lại các video bản thu giọng hát được lưu tự động khi bạn hát karaoke.</p>
          </div>
        </div>
        <div className="rec-hero-right">
          <div className="rec-hero-stat">
            <span className="rec-stat-val">{recordings.length}</span>
            <span className="rec-stat-lbl">Bản thu</span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {recordings.length === 0 ? (
        <div className="rec-empty">
          <div className="rec-empty-icon">🎬</div>
          <h3>Chưa Có Bản Thu Nào</h3>
          <p>Nhấn nút quay video trong trình phát nhạc khi hát để lưu lại những khoảnh khắc tuyệt vời!</p>
        </div>
      ) : (
        <div className="rec-grid">
          {recordings.map((rec) => (
            <div key={rec.id} className="rec-card" onClick={() => setPlayingRecording(rec)}>
              <div className="rec-card-thumb">
                <div className="rec-thumb-bg">
                  <Music2 size={36} className="rec-thumb-icon" />
                </div>
                <div className="rec-thumb-overlay" />
                <div className="rec-play-btn"><Play size={20} fill="white" /></div>
                {rec.video_id && (
                  <span className="rec-has-video-badge"><Video size={11} /> Video</span>
                )}
              </div>
              <div className="rec-card-body">
                <h4 className="rec-card-title" title={rec.title}>{rec.title}</h4>
                <div className="rec-card-meta">
                  <span className="rec-meta-item"><Calendar size={12} />{formatDate(rec.created_at)}</span>
                  {rec.duration && <span className="rec-meta-item"><Clock size={12} />{rec.duration}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Playback Modal ── */}
      {playingRecording && (
        <div className="video-modal-overlay" onClick={() => setPlayingRecording(null)}>
          <div className="video-modal-content large" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="video-modal-header">
              <div className="modal-header-info">
                <span className="modal-header-tag"><Mic size={13} /> Bản Thu Của Bạn</span>
                <h3>{playingRecording.title}</h3>
                <span className="modal-header-artist">
                  <Calendar size={12} /> {formatDate(playingRecording.created_at)}
                  {playingRecording.duration && <> &nbsp;·&nbsp; <Clock size={12} /> {playingRecording.duration}</>}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setPlayingRecording(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Player */}
            {playingRecording.video_id ? (
              <div className="split-view-player">
                <div className="youtube-pane">
                  <div className="pane-label">🎵 Nhạc gốc</div>
                  <YouTube
                    videoId={playingRecording.video_id}
                    opts={{ width: '100%', height: '100%', playerVars: { autoplay: 1, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3 } }}
                    onReady={(e) => { (window as any).__ytPlayer = e.target; }}
                    className="yt-player-wrapper"
                  />
                </div>
                <div className="local-pane">
                  <div className="pane-label">🎤 Giọng hát của bạn</div>
                  <CustomPlayer
                    src={convertFileSrc(playingRecording.file_path)}
                    autoPlay
                    onPlay={() => (window as any).__ytPlayer?.playVideo()}
                    onPause={() => (window as any).__ytPlayer?.pauseVideo()}
                    onSeeked={(t) => (window as any).__ytPlayer?.seekTo(t, true)}
                  />
                </div>
              </div>
            ) : (
              <div className="local-pane single">
                <div className="pane-label">🎤 Giọng hát của bạn</div>
                <CustomPlayer src={convertFileSrc(playingRecording.file_path)} autoPlay />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Recordings;
