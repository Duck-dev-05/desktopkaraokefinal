import { useState, useEffect } from "react";
import { Search, Mic2, Music, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SongCard from "../components/SongCard";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import "./Explore.css";

const MOOD_TAGS = [
  "TOP 100 Việt Nam",
  "Nhạc Trẻ 2024",
  "Karaoke Song Ca",
  "Nhạc Vàng Bất Hủ",
  "R&B Chill",
  "Rap & Hip Hop",
  "Nhạc Hoa Lời Việt",
];

const FEATURED_SINGERS = [
  { name: "Sơn Tùng M-TP", genre: "V-Pop / Dance", avatar: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop" },
  { name: "Mỹ Tâm", genre: "Nhạc Trẻ / Pop", avatar: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=300&auto=format&fit=crop" },
  { name: "Đen Vâu", genre: "Rap / Hip Hop", avatar: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f922?q=80&w=300&auto=format&fit=crop" },
  { name: "Taylor Swift", genre: "US-UK / Pop", avatar: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=300&auto=format&fit=crop" },
  { name: "Vũ", genre: "Indie / Pop Ballad", avatar: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop" },
  { name: "Bruno Mars", genre: "R&B / Soul", avatar: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop" },
];

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(MOOD_TAGS[0]);
  const [activeTab, setActiveTab] = useState<"genre" | "singer">("genre");
  const [songs, setSongs] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeMood) {
      fetchCategorySongs(activeMood);
    }
  }, [activeMood]);

  const fetchCategorySongs = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchYoutubeKaraoke(query);
      setSongs(results);
    } catch (err) {
      console.error("Error fetching explore category:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (activeTab === "singer") {
      navigate(`/artist?name=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      setActiveMood(null);
      fetchCategorySongs(searchQuery);
    }
  };

  const handleMoodTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveMood(tag);
    fetchCategorySongs(tag);
  };

  return (
    <div className="explore-page animate-fade-in">
      {/* Category / Singer Mode Tabs */}
      <div className="explore-mode-tabs">
        <button
          className={`explore-tab ${activeTab === "genre" ? "active" : ""}`}
          onClick={() => setActiveTab("genre")}
        >
          <Music size={18} />
          <span>Theo Thể Loại</span>
        </button>
        <button
          className={`explore-tab ${activeTab === "singer" ? "active" : ""}`}
          onClick={() => setActiveTab("singer")}
        >
          <Mic2 size={18} />
          <span>Theo Ca Sĩ / Nghệ Sĩ</span>
        </button>
      </div>

      {/* Search Header Bar */}
      <form onSubmit={handleSearchSubmit} className="search-container">
        <Search className="search-icon" size={22} />
        <input
          type="text"
          placeholder={
            activeTab === "singer"
              ? "Nhập tên ca sĩ (VD: Sơn Tùng M-TP, Mỹ Tâm, Taylor Swift...)..."
              : "Tìm kiếm bài hát, nghệ sĩ hoặc bản nhạc karaoke..."
          }
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {activeTab === "singer" && searchQuery.trim() && (
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '50px', padding: '0.4rem 1.2rem', whiteSpace: 'nowrap' }}>
            Xem Ca Sĩ
          </button>
        )}
      </form>

      {/* Featured Singers Grid when Singer Tab is active */}
      {activeTab === "singer" && (
        <section className="featured-singers-section">
          <div className="section-header">
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserCheck size={20} color="var(--accent)" />
              Ca Sĩ Karaoke Được Yêu Thích
            </h2>
          </div>
          <div className="featured-singers-grid">
            {FEATURED_SINGERS.map((singer) => (
              <div
                key={singer.name}
                className="singer-card"
                onClick={() => navigate(`/artist?name=${encodeURIComponent(singer.name)}`)}
              >
                <div className="singer-avatar-wrap">
                  <img src={singer.avatar} alt={singer.name} />
                  <div className="singer-overlay">
                    <Mic2 size={24} color="white" />
                  </div>
                </div>
                <div className="singer-info">
                  <h3 className="singer-card-name">{singer.name}</h3>
                  <p className="singer-card-genre">{singer.genre}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mood Quick Tags for Genre Tab */}
      {activeTab === "genre" && (
        <div className="mood-tags-container">
          {MOOD_TAGS.map((tag, idx) => (
            <button
              key={idx}
              className={`mood-chip ${activeMood === tag ? "active" : ""}`}
              onClick={() => handleMoodTagClick(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Category Results Section */}
      <section className="explore-results-section">
        <div className="section-header">
          <h2>
            {activeMood ? `Tuyển Tập ${activeMood}` : `Kết quả cho "${searchQuery}"`}
            {isLoading && <span className="loading-badge">Đang tải bài hát...</span>}
          </h2>
        </div>

        <div className="song-grid">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              id={song.id}
              title={song.title}
              artist={song.channelTitle}
              coverUrl={song.thumbnail || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"}
            />
          ))}
          {!isLoading && songs.length === 0 && (
            <p className="text-muted" style={{ gridColumn: '1 / -1' }}>
              Không tìm thấy bài hát nào. Hãy thử chọn một thể loại khác hoặc nhập từ khóa tìm kiếm mới!
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Explore;

