import React from "react";
import { Clock, Trash2 } from "lucide-react";
import { useHistory } from "../context/HistoryContext";
import SongCard from "../components/SongCard";
import "./History.css";

const History = () => {
  const { history, clearHistory } = useHistory();

  return (
    <div className="history-page animate-fade-in">
      <div className="page-header">
        <div className="page-header-icon">
          <Clock size={22} />
        </div>
        <div className="page-header-text">
          <h1 className="page-header-title">Phát Gần Đây</h1>
          <p className="page-header-subtitle">Những bài hát bạn đã nghe gần đây.</p>
        </div>
        {history.length > 0 && (
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-outline" onClick={clearHistory}>
              <Trash2 size={16} /> Xóa Lịch Sử
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Clock size={28} /></div>
          <p className="empty-state-title">Chưa Có Lịch Sử</p>
          <p className="empty-state-desc">Bạn chưa phát bài hát nào.</p>
        </div>
      ) : (
        <div className="history-grid">
          {history.map((video, index) => (
            <SongCard 
              key={`${video.id}-${index}`}
              id={video.id}
              title={video.title}
              artist={video.channelTitle}
              coverUrl={video.thumbnail}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
