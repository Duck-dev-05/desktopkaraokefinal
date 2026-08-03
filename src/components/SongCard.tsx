import { Play, Plus, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePlayer } from "../context/PlayerContext";
import { useQueue } from "../context/QueueContext";
import { invoke } from '@tauri-apps/api/core';
import { addDownload } from "../db";
import "./SongCard.css";

interface SongCardProps {
  id?: string | number;
  title: string;
  artist: string;
  coverUrl: string;
}

const SongCard = ({ id, title, artist, coverUrl }: SongCardProps) => {
  const { currentVideo, playVideo } = usePlayer();
  const { addToQueue, notify } = useQueue();
  const [isDownloading, setIsDownloading] = useState(false);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (id) {
      const video = {
        id: String(id),
        title: title,
        channelTitle: artist,
        thumbnail: coverUrl
      };
      
      if (currentVideo) {
        addToQueue(video);
      } else {
        playVideo(video);
      }
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id || isDownloading) return;
    
    setIsDownloading(true);
    notify(`Bắt đầu tải xuống: ${title}...`);
    
    try {
      const videoId = String(id);
      const filePath = await invoke<string>("download_video", { videoId });
      
      await addDownload(videoId, title, filePath);
      notify(`Tải xuống thành công: ${title}`);
    } catch (err: any) {
      console.error("Download failed:", err);
      notify(`Lỗi tải xuống: ${err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="song-card" onClick={handlePlay}>
      <img src={coverUrl} alt={title} className="card-image" />
      <div className="card-gradient-overlay"></div>
      
      {/* Play/Queue Button (Center) */}
      <button className="play-overlay btn" title={currentVideo && id ? "Thêm vào Hàng đợi" : "Phát"}>
        {currentVideo && id ? <Plus size={28} color="white" /> : <Play size={24} fill="white" color="white" />}
      </button>

      {/* Download Button (Top Right) */}
      <button 
        className="download-overlay btn icon-btn" 
        onClick={handleDownload}
        title="Tải xuống để hát ngoại tuyến"
        disabled={isDownloading}
      >
        {isDownloading ? <Loader2 size={18} className="spin" color="white" /> : <Download size={18} color="white" />}
      </button>

      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-artist">{artist}</p>
      </div>
    </div>
  );
};

export default SongCard;
