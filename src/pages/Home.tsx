import { useEffect, useState } from "react";
import { Flame, Globe, Music2, Mic2, ListMusic, Crown, Users, Play, Radio, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SongCard from "../components/SongCard";
import { searchYoutubeKaraoke, searchYoutubePlaylists, YoutubeVideo, YoutubePlaylist } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import { getRecordingsForUser } from "../db";
import "./Home.css";

const SINGER_NAMES = [
  { name: "Sơn Tùng M-TP", genre: "V-Pop / Dance" },
  { name: "Mỹ Tâm", genre: "Nhạc Trẻ / Pop" },
  { name: "Đen Vâu", genre: "Rap / Hip Hop" },
  { name: "Taylor Swift", genre: "US-UK / Pop" },
  { name: "Vũ", genre: "Indie / Pop Ballad" },
  { name: "Bruno Mars", genre: "R&B / Soul" },
];

const Home = () => {
  const [trendingSongs, setTrendingSongs] = useState<YoutubeVideo[]>([]);
  const [classicSongs, setClassicSongs] = useState<YoutubeVideo[]>([]);
  const [globalSongs, setGlobalSongs] = useState<YoutubeVideo[]>([]);
  const [playlists, setPlaylists] = useState<YoutubePlaylist[]>([]);
  const [featuredSingers, setFeaturedSingers] = useState<{name: string, genre: string, avatar: string}[]>([]);
  const [activeRooms, setActiveRooms] = useState<any[]>([]); // Empty array for real active rooms
  const [isLoading, setIsLoading] = useState(true);
  const [userSongCount, setUserSongCount] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const singersPromises = SINGER_NAMES.map(async (singer) => {
          try {
            const results = await searchYoutubeKaraoke(`${singer.name} karaoke`);
            if (results && results.length > 0) {
              return { ...singer, avatar: results[0].thumbnail };
            }
          } catch(e) {
            console.error(`Failed to fetch real data for singer ${singer.name}:`, e);
          }
          return { ...singer, avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop" };
        });

        const [trending, classic, global, youtubePlaylists, singers] = await Promise.all([
          searchYoutubeKaraoke("nhạc trẻ việt nam hot nhất"),
          searchYoutubeKaraoke("nhạc trữ tình bolero karaoke"),
          searchYoutubeKaraoke("us uk hit songs karaoke"),
          searchYoutubePlaylists("nhạc trẻ remix karaoke playlist"),
          Promise.all(singersPromises)
        ]);
        setTrendingSongs(trending);
        setClassicSongs(classic);
        setGlobalSongs(global);

        setPlaylists(youtubePlaylists);
        setFeaturedSingers(singers);
        setActiveRooms([]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user) {
        try {
          const recordings = await getRecordingsForUser(Number(user.id));
          setUserSongCount(recordings.length);
        } catch (err) {
          console.error("Failed to fetch user recordings:", err);
          setUserSongCount(0);
        }
      } else {
        setUserSongCount(null);
      }
    };
    fetchUserStats();
  }, [user]);

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
              <span className="hero-stat-num">{userSongCount !== null ? userSongCount : 0}</span>
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

      {/* ─── Ca Sĩ Nổi Bật (Featured Singers) ───────── */}
      <section className="song-section animate-fade-in stagger-2">
        <div className="section-header">
          <div className="section-title">
            <div className="section-title-pill" style={{ background: "linear-gradient(180deg, #8b5cf6, #3b82f6)" }} />
            <UserCheck size={20} color="#8b5cf6" />
            Ca Sĩ Nổi Bật
          </div>
          <button className="btn btn-ghost see-all-btn" onClick={() => navigate('/artist')}>Xem tất cả →</button>
        </div>
        <div className="featured-singers-grid-home">
          {featuredSingers.length > 0 ? (
            featuredSingers.map((singer) => (
              <div
                key={singer.name}
                className="singer-card-home"
                onClick={() => navigate(`/artist?name=${encodeURIComponent(singer.name)}`)}
              >
                <div className="singer-avatar-wrap-home">
                  <img src={singer.avatar} alt={singer.name} />
                  <div className="singer-overlay-home">
                    <Mic2 size={24} color="white" />
                  </div>
                </div>
                <div className="singer-info-home">
                  <h3 className="singer-card-name-home">{singer.name}</h3>
                  <p className="singer-card-genre-home">{singer.genre}</p>
                </div>
              </div>
            ))
          ) : (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '1/1.2', borderRadius: '20px' }}></div>
            ))
          )}
        </div>
      </section>

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
