import { useEffect, useState } from "react";
import { Play, GripVertical, Trash2, Mic2, ListMusic } from "lucide-react";
import { useQueue, QueuedVideo } from "../context/QueueContext";
import { usePlayer } from "../context/PlayerContext";
import "./Queue.css";

const Queue = () => {
  const { queue, removeFromQueue, clearQueue } = useQueue();
  const { playVideo } = usePlayer();

  const handlePlayNow = (item: QueuedVideo) => {
    playVideo(item);
    removeFromQueue(item.queueId);
  };

  const handleStartParty = () => {
    if (queue.length > 0) {
      handlePlayNow(queue[0]);
    }
  };

  return (
    <div className="queue-page animate-fade-in">
      <div className="page-header">
        <div className="page-header-icon">
          <ListMusic size={22} />
        </div>
        <div className="page-header-text">
          <h1 className="page-header-title">Tiếp Theo</h1>
          <p className="page-header-subtitle">{queue.length} bài hát trong hàng đợi</p>
        </div>
        <button 
          className="btn btn-primary start-party-btn"
          onClick={handleStartParty}
          disabled={queue.length === 0}
          style={{ opacity: queue.length === 0 ? 0.5 : 1 }}
        >
          <Play size={20} fill="black" />
          Bắt Đầu Bữa Tiệc
        </button>
      </div>



      <div className="queue-list">
        {queue.length > 0 ? queue.map((item, index) => (
          <div className="queue-item" key={item.queueId} onClick={() => handlePlayNow(item)} style={{ cursor: 'pointer' }}>
            <div className="drag-handle">
              <GripVertical size={20} />
            </div>
            <div className="queue-index">{index + 1}</div>
            <img src={item.thumbnail} alt={item.title} className="queue-thumbnail" />
            <div className="queue-song-info">
              <span className="song-title">{item.title}</span>
              <span className="song-artist">YouTube • {item.channelTitle}</span>
            </div>
            <div className="queue-duration">
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Phát Ngay
              </button>
            </div>
            <button 
              className="btn icon-btn-outline delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeFromQueue(item.queueId);
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )) : (
          <div className="empty-state animate-fade-in">
            <ListMusic size={64} className="empty-state-icon" />
            <h3>Hàng Đợi Trống</h3>
            <p className="text-muted">Bạn chưa chọn bài hát nào. Hãy tìm kiếm và thêm bài hát vào hàng đợi để bắt đầu hát!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Queue;
