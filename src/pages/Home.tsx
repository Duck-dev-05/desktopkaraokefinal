import { useEffect, useState } from "react";
import { Flame, Globe, Music2, Mic2, ListMusic, Crown, Users, Play, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SongCard from "../components/SongCard";
import { searchYoutubeKaraoke, searchYoutubePlaylists, YoutubeVideo, YoutubePlaylist } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import "./Home.css";

const Home = () => {
  const [trendingSongs, setTrendingSongs] = useState<YoutubeVideo[]>([]);
  const [classicSongs, setClassicSongs] = useState<YoutubeVideo[]>([]);
  const [globalSongs, setGlobalSongs] = useState<YoutubeVideo[]>([]);
  const [playlists, setPlaylists] = useState<YoutubePlaylist[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]); // Empty array for real active rooms
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [trending, classic, global, youtubePlaylists] = await Promise.all([
          searchYoutubeKaraoke("nhạc trẻ việt nam hot nhất"),
          searchYoutubeKaraoke("nhạc trữ tình bolero karaoke"),
          searchYoutubeKaraoke("us uk hit songs karaoke"),
          searchYoutubePlaylists("nhạc trẻ remix karaoke playlist")
        ]);
        setTrendingSongs(trending);
        setClassicSongs(classic);
        setGlobalSongs(global);

        setPlaylists(youtubePlaylists);
        setActiveRooms([]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  const renderGrid = (songs: YoutubeVideo[]) => (
    <div className="song-grid">
      {isLoading ? (
        Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: '20px' }}></div>
        ))
      ) : (
        songs.slice(0, 12).map((song) => (
          <SongCard
            key={song.id}
            id={song.id}
            title={song.title}
            artist={song.channelTitle}
            coverUrl={
              song.thumbnail ||
              "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"
            }
          />
        ))
      )}
      {!isLoading && songs.length === 0 && (
        <p className="text-muted" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem 0" }}>
          Hãy cấu hình YouTube API Key trong file .env để tải bài hát.
        </p>
      )}
    </div>
  );

  return (
    <div className="home-page animate-fade-in">
      {/* ─── Aurora Hero ──────────────────────────── */}
      <div className="home-hero">
        <div className="home-hero-aurora" />
        <div className="home-hero-aurora-cyan" />
        <div className="home-hero-content">
          <div className="hero-greeting-pill badge badge-primary animate-scale-in">
            🎤 &nbsp;Karaoke Mode
          </div>
          <h1 className="hero-title animate-fade-in stagger-1">
            {user ? (
              <>Chào trở lại, <span className="hero-name">{user.username}</span>! 🎶</>
            ) : (
              <>Sẵn sàng <span className="hero-name">tỏa sáng</span> hôm nay?</>
            )}
          </h1>
          <p className="hero-subtitle animate-fade-in stagger-2">
            Khám phá hàng ngàn bài karaoke · Hát cùng bạn bè · Ghi âm & Chia sẻ
          </p>
          <div className="hero-stats animate-fade-in stagger-3">
            <div className="hero-stat">
              <span className="hero-stat-num">∞</span>
              <span className="hero-stat-label">Bài hát</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">HD</span>
              <span className="hero-stat-label">Chất lượng</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <span className="hero-stat-num">Live</span>
              <span className="hero-stat-label">Party Mode</span>
            </div>
          </div>
        </div>
        <div className="home-hero-disc">🎙️</div>
      </div>

      {/* ─── Quick Actions ──────────────────────────── */}
      <section className="quick-actions animate-fade-in stagger-1">
        <div className="action-card" onClick={() => navigate('/explore')}>
          <div className="action-icon-wrapper">
            <Mic2 size={24} />
          </div>
          <div className="action-text">
            <span className="action-title">Hát Ngay</span>
            <span className="action-desc">Khám phá bài mới</span>
          </div>
        </div>
        <div className="action-card" onClick={() => navigate('/playlist/default')}>
          <div className="action-icon-wrapper">
            <ListMusic size={24} />
          </div>
          <div className="action-text">
            <span className="action-title">Playlist</span>
            <span className="action-desc">Tuyển tập của bạn</span>
          </div>
        </div>
        <div className="action-card" onClick={() => navigate('/premium')}>
          <div className="action-icon-wrapper">
            <Crown size={24} />
          </div>
          <div className="action-text">
            <span className="action-title">Premium</span>
            <span className="action-desc">Trải nghiệm VIP</span>
          </div>
        </div>
        <div className="action-card" onClick={() => navigate('/party')}>
          <div className="action-icon-wrapper">
            <Users size={24} />
          </div>
          <div className="action-text">
            <span className="action-title">Party Mode</span>
            <span className="action-desc">Hát cùng bạn bè</span>
          </div>
        </div>
      </section>

      {/* ─── Playlists Dành Cho Bạn ─────────────────── */}
      {playlists.length > 0 && (
        <section className="song-section animate-fade-in stagger-2">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-pill" style={{ background: "linear-gradient(180deg, #ec4899, #8b5cf6)" }} />
              <Play size={20} color="#ec4899" />
              Playlist Dành Cho Bạn
            </div>
            <button className="btn btn-ghost see-all-btn" onClick={() => navigate('/playlist/default')}>Xem tất cả →</button>
          </div>
          <div className="playlists-container">
            {playlists.map((playlist, idx) => (
              <div key={idx} className="playlist-card-v2" onClick={() => navigate(`/playlist/${playlist.id}`)}>
                {/* Thumbnail */}
                <div className="plv2-thumb-wrap">
                  <img src={playlist.thumbnail} alt={playlist.title} className="plv2-thumb" />
                  <div className="plv2-thumb-overlay" />
                  <button className="plv2-play-btn">
                    <Play size={22} fill="white" color="white" />
                  </button>
                  <span className="plv2-badge">Playlist</span>
                </div>
                {/* Info */}
                <div className="plv2-info">
                  <div className="plv2-title">{playlist.title}</div>
                  <div className="plv2-channel">
                    <span className="plv2-dot" />
                    {playlist.channelTitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Active Party Rooms ─────────────────────── */}
      {activeRooms.length > 0 && (
        <section className="song-section animate-fade-in stagger-3">
          <div className="section-header">
            <div className="section-title">
              <div className="section-title-pill" style={{ background: "linear-gradient(180deg, #10b981, #059669)" }} />
              <Radio size={20} color="#10b981" />
              Phòng Hát Đang Mở
            </div>
          </div>
          <div className="party-rooms-grid">
            {activeRooms.map((room, idx) => (
              <div key={idx} className="room-card" onClick={() => navigate('/party')}>
                <div className="room-info">
                  <div className="room-name">
                    {room.name}
                    <div className="live-indicator" />
                  </div>
                  <div className="room-host">Host: {room.host}</div>
                </div>
                <button className="join-btn">Tham Gia</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Trending Section ─────────────────────── */}
      <section className="song-section animate-fade-in stagger-2">
        <div className="section-header">
          <div className="section-title">
            <div className="section-title-pill" />
            <Flame size={20} color="var(--secondary)" />
            Nhạc Trẻ Thịnh Hành
            {isLoading && <span className="loading-chip">Đang tải...</span>}
          </div>
          <button className="btn btn-ghost see-all-btn">Xem tất cả →</button>
        </div>
        {renderGrid(trendingSongs)}
      </section>

      {/* ─── Classic Section ──────────────────────── */}
      <section className="song-section animate-fade-in stagger-3">
        <div className="section-header">
          <div className="section-title">
            <div className="section-title-pill" style={{ background: "linear-gradient(180deg, var(--gold), #f97316)" }} />
            <Music2 size={20} color="var(--gold)" />
            Nhạc Trữ Tình Bất Hủ
          </div>
          <button className="btn btn-ghost see-all-btn">Xem tất cả →</button>
        </div>
        {renderGrid(classicSongs)}
      </section>

      {/* ─── Global Section ───────────────────────── */}
      <section className="song-section animate-fade-in stagger-4">
        <div className="section-header">
          <div className="section-title">
            <div className="section-title-pill" style={{ background: "linear-gradient(180deg, var(--accent), #0284c7)" }} />
            <Globe size={20} color="var(--accent)" />
            Nhạc Quốc Tế (US/UK)
          </div>
          <button className="btn btn-ghost see-all-btn">Xem tất cả →</button>
        </div>
        {renderGrid(globalSongs)}
      </section>
    </div>
  );
};

export default Home;
