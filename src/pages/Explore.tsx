import { useState, useEffect, useRef } from "react";
import { Search, Mic, Clock, ListFilter, History, X } from "lucide-react";
import SongCard from "../components/SongCard";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import { useAuth } from "../context/AuthContext";
import { addSearchHistory, getSearchHistory, clearSearchHistory, SearchHistory as ISearchHistory } from "../db";
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
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMood, setActiveMood] = useState<string | null>(MOOD_TAGS[0]);
  const [songs, setSongs] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // New State for Advanced Search
  const [duration, setDuration] = useState<string>("");
  const [order, setOrder] = useState<string>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  
  // Search History
  const [history, setHistory] = useState<ISearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeMood) {
      fetchCategorySongs(activeMood, "", "relevance");
    }
  }, [activeMood]);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (user) {
      const hist = await getSearchHistory(user.id);
      setHistory(hist);
    }
  };

  const fetchCategorySongs = async (query: string, dur: string = duration, ord: string = order) => {
    setIsLoading(true);
    try {
      const results = await searchYoutubeKaraoke(query, dur, ord);
      setSongs(results);
      if (user && query && !MOOD_TAGS.includes(query)) {
        await addSearchHistory(user.id, query);
        loadHistory();
      }
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
    setShowHistory(false);
    fetchCategorySongs(searchQuery);
  };

  const handleMoodTagClick = (tag: string) => {
    setSearchQuery(tag);
    setActiveMood(tag);
    setShowHistory(false);
    fetchCategorySongs(tag, "", "relevance");
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setActiveMood(null);
    setShowHistory(false);
    fetchCategorySongs(query);
  };

  const handleClearHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      await clearSearchHistory(user.id);
      setHistory([]);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ tìm kiếm bằng giọng nói.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setSearchQuery(speechResult);
      setActiveMood(null);
      fetchCategorySongs(speechResult);
    };

    recognition.onspeechend = () => {
      recognition.stop();
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="explore-page animate-fade-in">
      {/* Search Header Bar */}
      <div className="search-header-wrapper" style={{position: 'relative'}}>
        <form onSubmit={handleSearchSubmit} className="search-container">
          <Search className="search-icon" size={22} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm bài hát, nghệ sĩ hoặc bản nhạc karaoke..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
          />
          <button type="button" className={`voice-search-btn ${isListening ? 'listening' : ''}`} onClick={handleVoiceSearch} title="Tìm kiếm bằng giọng nói">
            <Mic size={20} color={isListening ? "#ff4081" : "currentColor"} />
          </button>
          <button type="button" className="filter-toggle-btn" onClick={() => setShowFilters(!showFilters)} title="Bộ lọc nâng cao">
            <ListFilter size={20} />
          </button>
        </form>

        {showHistory && history.length > 0 && (
          <div className="search-history-dropdown glass" style={{position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '0.5rem', borderRadius: '12px', padding: '1rem', background: 'var(--bg-card)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
              <span style={{fontSize: '0.9rem'}}>Lịch sử tìm kiếm</span>
              <button onClick={handleClearHistory} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem'}}>Xóa tất cả</button>
            </div>
            {history.map(item => (
              <div key={item.id} className="history-item" onClick={() => handleHistoryClick(item.search_query)} style={{display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                <History size={16} color="var(--text-muted)"/>
                <span>{item.search_query}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="advanced-filters animate-fade-in" style={{display: 'flex', gap: '1rem', marginTop: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px'}}>
          <div className="filter-group">
            <label style={{fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem'}}><Clock size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem'}}/> Thời lượng</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)'}}>
              <option value="">Bất kỳ</option>
              <option value="short">Ngắn (&lt; 4 phút)</option>
              <option value="medium">Trung bình (4-20 phút)</option>
              <option value="long">Dài (&gt; 20 phút)</option>
            </select>
          </div>
          <div className="filter-group">
            <label style={{fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem'}}><ListFilter size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem'}}/> Sắp xếp theo</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)} style={{padding: '0.5rem', borderRadius: '8px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)'}}>
              <option value="relevance">Liên quan nhất</option>
              <option value="date">Mới nhất</option>
              <option value="viewCount">Lượt xem nhiều nhất</option>
              <option value="rating">Đánh giá cao nhất</option>
            </select>
          </div>
        </div>
      )}

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
