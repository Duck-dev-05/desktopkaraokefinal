import { useState, useEffect } from "react";
import { Search } from "lucide-react";
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

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(MOOD_TAGS[0]);
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
    setActiveMood(null);
    fetchCategorySongs(searchQuery);
  };

  const handleMoodTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveMood(tag);
    fetchCategorySongs(tag);
  };

  return (
    <div className="explore-page animate-fade-in">
      {/* Search Header Bar */}
      <form onSubmit={handleSearchSubmit} className="search-container">
        <Search className="search-icon" size={22} />
        <input
          type="text"
          placeholder="Tìm kiếm bài hát, nghệ sĩ hoặc bản nhạc karaoke..."
          className="search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      {/* Mood Quick Tags */}
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
