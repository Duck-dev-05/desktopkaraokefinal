import React, { useState } from 'react';
import { FolderUp, Play, X, Music, Video as VideoIcon } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import './LocalMedia.css';

const LocalMedia: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'video' | 'audio' | null>(null);

  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Media',
          extensions: ['mp4', 'mkv', 'webm', 'mp3', 'wav', 'm4a', 'flac']
        }]
      });

      if (selected && typeof selected === 'string') {
        const url = convertFileSrc(selected);
        const name = selected.split(/[\\/]/).pop() || "Local Track";
        setFileUrl(url);
        setFileName(name);
        
        const ext = name.split('.').pop()?.toLowerCase();
        if (['mp3', 'wav', 'm4a', 'flac'].includes(ext || '')) {
          setFileType('audio');
        } else {
          setFileType('video');
        }
      }
    } catch (err) {
      console.error(err);
      alert("Không thể mở file.");
    }
  };

  const handleClose = () => {
    setFileUrl(null);
    setFileName('');
    setFileType(null);
  };

  return (
    <div className="page-container local-media-page animate-fade-in">
      <div className="local-media-header">
        <h1><FolderUp size={32} color="#a855f7" /> Nhạc Nội Bộ</h1>
        <p>Phát các file karaoke video hoặc audio lưu trữ trên máy tính của bạn.</p>
      </div>

      <div className="local-media-content">
        {!fileUrl ? (
          <div className="local-upload-card" onClick={handleOpenFile}>
            <div className="local-upload-icon">
              <FolderUp size={32} />
            </div>
            <h2>Chọn File Media</h2>
            <p className="text-muted">Hỗ trợ các định dạng video (.mp4, .mkv) và audio (.mp3, .wav)</p>
            <button className="btn btn-primary">Duyệt File</button>
          </div>
        ) : (
          <>
            <div className="local-now-playing">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {fileType === 'audio' ? <Music size={24} color="#a855f7" /> : <VideoIcon size={24} color="#a855f7" />}
                <h3>{fileName}</h3>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleClose}>
                <X size={16} /> Đóng file
              </button>
            </div>
            
            <div className="local-player-wrapper">
              {fileType === 'video' ? (
                <video src={fileUrl} controls autoPlay />
              ) : (
                <audio src={fileUrl} controls autoPlay />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LocalMedia;
