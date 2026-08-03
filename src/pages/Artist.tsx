import { useEffect, useState } from "react";
import { Play, Plus, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import "./Artist.css";

const Artist = () => {
  const navigate = useNavigate();
  const [topTracks, setTopTracks] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch karaoke songs for the artist
    searchYoutubeKaraoke("The Weeknd").then(res => {
      setTopTracks(res);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="artist-page animate-fade-in">
      <div className="artist-header-bg">
        <img src="https://images.unsplash.com/photo-1493225457124-a1a2a5f5f922?q=80&w=1200&auto=format&fit=crop" alt="The Weeknd Cover" />
        <div className="artist-header-overlay">
          <div className="verified-badge">✓ Nghệ Sĩ Đã Xác Minh</div>
          <h1 className="artist-title">The Weeknd</h1>
          <p className="monthly-listeners">104,230,450 người nghe hàng tháng</p>
        </div>
      </div>

      <div className="artist-actions">
        <button className="btn btn-primary play-all-btn">
          <Play size={24} fill="black" />
        </button>
        <button className="btn btn-follow">Theo dõi</button>
        <button className="btn icon-btn-outline">
          <MoreHorizontal size={24} />
        </button>
      </div>

      <div className="artist-content">
        <div className="section-title">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>Các Bài Hát Phổ Biến {isLoading && <span style={{fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal'}}>(Đang tải...)</span>}</h2>
        </div>
        
        <div className="tracks-list">
          {topTracks.length > 0 ? topTracks.map((track, idx) => (
            <div 
              className="track-row" 
              key={track.id} 
              style={{ gridTemplateColumns: '40px 60px 1fr 80px', cursor: 'pointer' }}
              onClick={() => navigate(`/sing?videoId=${track.id}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.channelTitle)}`)}
            >
              <div className="track-index">{idx + 1}</div>
              <div className="track-img">
                <img src={track.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"} alt="album cover" />
                <Play className="track-play-icon" size={16} fill="white" />
              </div>
              <div className="track-title">{track.title}</div>
              <div className="track-duration">--:--</div>
            </div>
          )) : (
            !isLoading && <p className="text-muted" style={{ padding: '2rem' }}>Không tìm thấy bài hát nào của nghệ sĩ này.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Artist;
