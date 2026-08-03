import React, { useEffect, useState, useRef } from 'react';
import { Users, Play, Mic2, Star, X, Music2, Loader2, Clock, Square, Save } from 'lucide-react';
import { getDuets, Duet, saveRecording, addAudioRecording } from '../db';
import { usePlayer } from '../context/PlayerContext';
import { useParty } from '../context/PartyContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import YouTube from 'react-youtube';
import './DuetManager.css';

interface DuetManagerProps {
  onClose: () => void;
}

const DuetManager: React.FC<DuetManagerProps> = ({ onClose }) => {
  const { playVideo, closePlayer } = usePlayer();
  const { roomId, localStream } = useParty();
  const [duets, setDuets] = useState<Duet[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<Duet | null>(null);

  const [duetTarget, setDuetTarget] = useState<Duet | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const originalAudioRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    getDuets().then(data => {
      setDuets(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleDuetNow = (duet: Duet) => {
    if (!roomId) {
      alert("Tính năng Hát Đôi chỉ có thể sử dụng khi bạn đang trong phòng Hát Cùng Nhau (Meeting). Vui lòng tham gia phòng trước!");
      onClose();
      return;
    }
    if (!duet.recorded_file_path) {
      alert("Bản thu này không có file gốc để hát đôi.");
      return;
    }
    closePlayer();
    setDuetTarget(duet);
  };

  const startRecording = async () => {
    try {
      let stream = localStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      
      ytPlayerRef.current?.playVideo();
      if (originalAudioRef.current) {
        originalAudioRef.current.currentTime = 0;
        originalAudioRef.current.play();
      }
    } catch (err) {
      console.error("Lỗi microphone:", err);
      alert("Không thể truy cập microphone.");
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    ytPlayerRef.current?.pauseVideo();
    originalAudioRef.current?.pause();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setTimeout(async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const tempName = `temp_vocal_${Date.now()}.webm`;
        const tempPath = await invoke<string>('save_audio_recording', {
          fileName: tempName,
          audioData: Array.from(uint8Array)
        });
        
        const outName = `duet_mixed_${Date.now()}.webm`;
        const mixedPath = await invoke<string>('merge_duet', {
          originalPath: duetTarget!.recorded_file_path,
          newVocalPath: tempPath,
          outputFilename: outName
        });
        
        await addAudioRecording(
          `Duet: ${duetTarget!.song_title}`,
          mixedPath,
          '0:00',
          duetTarget!.video_id
        );
        await saveRecording(1, duetTarget!.video_id, duetTarget!.song_title, duetTarget!.artist, duetTarget!.cover_url, 100);
        
        alert("Đã lưu bản thu hát đôi thành công!");
        setDuetTarget(null);
      } catch (err) {
        console.error("Lỗi xử lý:", err);
        alert("Có lỗi khi xử lý bản thu.");
      } finally {
        setIsProcessing(false);
      }
    }, 500);
  };

  const closeRecordingModal = () => {
    if (isRecording) stopRecording();
    setDuetTarget(null);
  };

  const handlePlay = (duet: Duet) => {
    if (duet.recorded_file_path) {
      setPlayingRecording(duet);
    } else {
      alert("Không tìm thấy file bản thu cho bài hát này.");
    }
  };

  const renderStars = (score: number) => {
    const stars = Math.round(score / 20); // convert 0–100 to 0–5
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={13}
        fill={i < stars ? '#fbbf24' : 'none'}
        color={i < stars ? '#fbbf24' : '#4b5563'}
      />
    ));
  };

  return (
    <div className="video-modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="video-modal-content large" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-default)', padding: 0, overflowY: 'auto' }}>
        
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(26,26,46,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
              <Users size={24} color="#a855f7" /> Danh sách Hát Đôi
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chọn bản thu để song ca trong phòng này</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="duets-page" style={{ padding: '2rem' }}>
          {/* Content */}
          {loading ? (
            <div className="duets-loading">
              <Loader2 size={40} className="spin-icon" />
              <p>Đang tải bản thu...</p>
            </div>
          ) : duets.length === 0 ? (
            <div className="duets-empty">
              <div className="duets-empty-icon">🎵</div>
              <h3>Chưa có bản thu nào</h3>
              <p>Hãy thu âm một bài hát trước để bắt đầu hát đôi với chính mình!</p>
            </div>
          ) : (
            <div className="duets-grid">
              {duets.map(duet => (
                <div key={duet.id} className="duet-card">
                  {/* Thumbnail banner */}
                  <div className="duet-card-thumbnail">
                    {duet.cover_url ? (
                      <img src={duet.cover_url} alt={duet.song_title} />
                    ) : (
                      <div className="duet-thumb-placeholder">
                        <Music2 size={32} />
                      </div>
                    )}
                    <div className="duet-thumb-overlay" />
                    <span className="duet-score-badge">
                      {renderStars(duet.likes)}
                      <span className="score-num">{Math.round(duet.likes)}</span>
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="duet-card-body">
                    {/* User row */}
                    <div className="duet-user-row">
                      <img
                        src={duet.avatar_url || `https://i.pravatar.cc/150?u=${duet.user_name}`}
                        alt={duet.user_name}
                        className="duet-avatar"
                      />
                      <div className="duet-user-info">
                        <span className="duet-username">{duet.user_name}</span>
                        <span className="part-badge">Cần giọng: {duet.part}</span>
                      </div>
                    </div>

                    {/* Song info */}
                    <div className="duet-song-info">
                      <h3 title={duet.song_title}>{duet.song_title}</h3>
                      <p>{duet.artist}</p>
                    </div>

                    {/* Actions */}
                    <div className="duet-card-actions">
                      <button
                        className="duet-btn-listen"
                        onClick={() => handlePlay(duet)}
                        title="Nghe lại bản thu"
                      >
                        <Play size={16} />
                        Nghe lại
                      </button>
                      <button
                        className="duet-btn-sing"
                        onClick={() => handleDuetNow(duet)}
                      >
                        <Mic2 size={16} />
                        Song ca ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Playback Modal */}
          {playingRecording && playingRecording.recorded_file_path && (
            <div className="video-modal-overlay" onClick={() => setPlayingRecording(null)} style={{ zIndex: 10001 }}>
              <div className="video-modal-content large" onClick={e => e.stopPropagation()}>
                <div className="video-modal-header">
                  <div className="modal-header-info">
                    <span className="modal-header-tag"><Mic2 size={14} /> Bản thu của bạn</span>
                    <h3>{playingRecording.song_title}</h3>
                    <span className="modal-header-artist">{playingRecording.artist}</span>
                  </div>
                  <button className="modal-close-btn" onClick={() => setPlayingRecording(null)}>
                    <X size={20} />
                  </button>
                </div>
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
                      <video
                        src={convertFileSrc(playingRecording.recorded_file_path)}
                        controls
                        autoPlay
                        className="recorded-video-player"
                        onPlay={() => (window as any).__ytPlayer?.playVideo()}
                        onPause={() => (window as any).__ytPlayer?.pauseVideo()}
                        onSeeked={(e) => (window as any).__ytPlayer?.seekTo(e.currentTarget.currentTime, true)}
                      />
                    </div>
                  </div>
                ) : (
                  <video src={convertFileSrc(playingRecording.recorded_file_path)} controls autoPlay className="recorded-video-player" />
                )}
              </div>
            </div>
          )}

          {/* Recording Modal */}
          {duetTarget && (
            <div className="video-modal-overlay" onClick={closeRecordingModal} style={{ zIndex: 10001 }}>
              <div className="video-modal-content large" onClick={e => e.stopPropagation()}>
                <div className="video-modal-header">
                  <div className="modal-header-info">
                    <span className="modal-header-tag"><Mic2 size={14} /> Phòng Thu Hát Đôi</span>
                    <h3>{duetTarget.song_title}</h3>
                    <span className="modal-header-artist">{duetTarget.artist}</span>
                  </div>
                  <button className="modal-close-btn" onClick={closeRecordingModal}>
                    <X size={20} />
                  </button>
                </div>
                
                <div className="split-view-player">
                  <div className="youtube-pane">
                    <div className="pane-label">🎵 Nhạc gốc</div>
                    <YouTube
                      videoId={duetTarget.video_id}
                      opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, iv_load_policy: 3 } }}
                      onReady={(e) => { ytPlayerRef.current = e.target; }}
                      className="yt-player-wrapper"
                    />
                  </div>
                  <div className="local-pane">
                    <div className="pane-label">🎤 Giọng hát đối tác ({duetTarget.user_name})</div>
                    <video
                      ref={originalAudioRef}
                      src={convertFileSrc(duetTarget.recorded_file_path!)}
                      controls={false}
                      className="recorded-video-player"
                      onPlay={() => ytPlayerRef.current?.playVideo()}
                      onPause={() => ytPlayerRef.current?.pauseVideo()}
                      onSeeked={(e) => ytPlayerRef.current?.seekTo(e.currentTarget.currentTime, true)}
                    />
                  </div>
                </div>

                <div className="recording-controls" style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', gap: '15px', padding: '15px' }}>
                  {isProcessing ? (
                    <button className="btn btn-primary" disabled style={{ opacity: 0.7 }}>
                      <Loader2 size={18} className="spin-icon" /> Đang trộn âm thanh...
                    </button>
                  ) : isRecording ? (
                    <button className="btn btn-danger" onClick={stopRecording} style={{ backgroundColor: '#ef4444', color: 'white', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
                      <Square size={18} fill="currentColor" /> Dừng & Lưu
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={startRecording} style={{ backgroundColor: '#10b981', color: 'white', padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
                      <Mic2 size={18} /> Bắt đầu Thu Âm
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DuetManager;
