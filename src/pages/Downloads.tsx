import React, { useEffect, useState } from "react";
import { Download as DownloadIcon, Play, Upload } from "lucide-react";
import { getDownloads, addDownload, addSong, Download } from "../db";
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import "./Downloads.css";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Downloads = () => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const { playVideo } = usePlayer();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDownloads();
  }, []);

  const loadDownloads = async () => {
    try {
      const data = await getDownloads();
      setDownloads(data);
    } catch (err) {
      console.error("Failed to load downloads", err);
    }
  };

  const handlePlayOffline = (download: Download) => {
    const assetUrl = convertFileSrc(download.file_path);
    playVideo({
      id: "local_" + download.id,
      title: download.title,
      thumbnail: download.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
      channelTitle: download.channel_title || "Offline Local File",
      isLocal: true,
      localUrl: assetUrl
    });
  };

  const handleUploadLocal = async () => {
    if (!user || user.role === 'user' || user.role === 'free_plan') {
      alert("Tính năng tải/thêm nhạc ngoại tuyến chỉ dành cho thành viên Premium. Vui lòng nâng cấp!");
      navigate('/premium');
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Audio/Video',
          extensions: ['mp3', 'mp4', 'mkv', 'wav', 'm4a']
        }]
      });

      if (selected && typeof selected === 'string') {
        const fileName = selected.split(/[\\/]/).pop() || "Local Track";
        
        // Copy file via Rust backend
        const destPath = await invoke<string>("import_local_file", { sourcePath: selected });
        
        // Add to our downloads ledger
        await addDownload("local_" + Date.now(), fileName, destPath);

        // Also add to the main songs library so it can be added to playlists/queue
        // We use a default placeholder cover image for local files
        const coverUrl = "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80";
        await addSong(fileName, "Local Upload", coverUrl, "0:00", destPath);
        
        // Refresh list
        loadDownloads();
      }
    } catch (err) {
      console.error("Failed to upload local file:", err);
      alert("Error importing file: " + err);
    }
  };

  return (
    <div className="downloads-page animate-fade-in">
      <div className="page-header">
        <div className="page-header-icon">
          <DownloadIcon size={22} />
        </div>
        <div className="page-header-text">
          <h1 className="page-header-title">Tải Xuống</h1>
          <p className="page-header-subtitle">Nghe ngoại tuyến các bài hát đã tải về máy.</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={handleUploadLocal}>
            <Upload size={18} />
            Tải Lên Tệp Nội Bộ
          </button>
        </div>
      </div>

      {downloads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><DownloadIcon size={28} /></div>
          <p className="empty-state-title">Chưa Có Tệp Nào</p>
          <p className="empty-state-desc">Các bài hát bạn tải xuống sẽ xuất hiện ở đây.</p>
        </div>
      ) : (
        <div className="downloads-list">
          {downloads.map((item) => (
            <div key={item.id} className="download-item glass-panel" style={{ display: 'flex', alignItems: 'center' }}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} className="download-thumbnail" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginRight: '16px' }} />
              ) : (
                <div style={{ width: '80px', height: '60px', borderRadius: '8px', marginRight: '16px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DownloadIcon size={24} color="rgba(255,255,255,0.5)" />
                </div>
              )}
              <div className="download-info" style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{item.title}</h3>
                <span className="text-muted text-sm" style={{ display: 'block', fontSize: '0.85rem' }}>
                  {item.channel_title ? `${item.channel_title} • ` : ''}Tải ngày: {new Date(item.downloaded_at).toLocaleDateString()}
                </span>
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => handlePlayOffline(item)}
              >
                <Play size={16} />
                Phát
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Downloads;
