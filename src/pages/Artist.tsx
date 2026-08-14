import { useEffect, useState } from "react";
import { Play, Plus, Search, Mic2, UserCheck, Sparkles } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import { usePlayer } from "../context/PlayerContext";
import { useQueue } from "../context/QueueContext";
import { useParty } from "../context/PartyContext";
import "./Artist.css";

const POPULAR_SINGERS = [
  { name: "Sơn Tùng M-TP", cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop" },
  { name: "Mỹ Tâm", cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop" },
  { name: "Đen Vâu", cover: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5f922?q=80&w=600&auto=format&fit=crop" },
  { name: "Taylor Swift", cover: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=600&auto=format&fit=crop" },
  { name: "Vũ", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop" },
  { name: "Bruno Mars", cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop" },
  { name: "Bích Phương", cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop" },
  { name: "Hoà Minzy", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=600&auto=format&fit=crop" },
];

const Artist = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryArtist = searchParams.get("name") || "Sơn Tùng M-TP";

  const [artistName, setArtistName] = useState(queryArtist);
  const [searchInput, setSearchInput] = useState(queryArtist);
  const [topTracks, setTopTracks] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { playVideo } = usePlayer();
  const { addToQueue } = useQueue();
  const { roomId, addSongToPartyQueue } = useParty();

  // Sync search input when URL query parameter changes
  useEffect(() => {
    const urlArtist = searchParams.get("name");
    if (urlArtist && urlArtist !== artistName) {
      setArtistName(urlArtist);
      setSearchInput(urlArtist);
    }
  }, [searchParams]);

  useEffect(() => {
    setIsLoading(true);
    searchYoutubeKaraoke(`${artistName} karaoke`)
      .then((res) => {
        setTopTracks(res);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch artist songs:", err);
        setIsLoading(false);
      });
  }, [artistName]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setArtistName(searchInput.trim());
    setSearchParams({ name: searchInput.trim() });
  };

  const handleSelectSinger = (singerName: string) => {
    setSearchInput(singerName);
    setArtistName(singerName);
    setSearchParams({ name: singerName });
  };

  const handlePlaySong = (track: YoutubeVideo) => {
    playVideo(track);
  };

  const handleQueueSong = (e: React.MouseEvent, track: YoutubeVideo) => {
    e.stopPropagation();
    if (roomId) {
      addSongToPartyQueue(track);
    } else {
      addToQueue(track);
    }
  };

  const handlePlayAll = () => {
    if (topTracks.length > 0) {
      playVideo(topTracks[0]);
      topTracks.slice(1).forEach((t) => {
        if (roomId) {
          addSongToPartyQueue(t);
        } else {
          addToQueue(t);
        }
      });
    }
  };

  const currentSingerInfo = POPULAR_SINGERS.find(
    (s) => s.name.toLowerCase() === artistName.toLowerCase()
  );
  const coverImage =
    currentSingerInfo?.cover ||
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop";

  return (
    <div className="artist-page animate-fade-in">
      {/* ─── Singer Search Bar Header ───────────────── */}
      <div className="artist-search-bar-wrap">
        <form onSubmit={handleSearchSubmit} className="artist-search-form">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="artist-search-input"
            placeholder="Nhập tên ca sĩ / nghệ sĩ bạn muốn tìm bài hát..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary artist-search-btn">
            <Mic2 size={16} />
            <span>Tìm Bài Hát Ca Sĩ</span>
          </button>
        </form>
      </div>

      {/* ─── Popular Singers Quick Select Bar ───────── */}
      <div className="popular-singers-section">
        <div className="popular-singers-header">
          <Sparkles size={16} color="var(--accent)" />
          <span>Ca Sĩ Nổi Bật:</span>
        </div>
        <div className="popular-singers-chips">
          {POPULAR_SINGERS.map((singer) => (
            <button
              key={singer.name}
              className={`singer-chip ${
                singer.name.toLowerCase() === artistName.toLowerCase() ? "active" : ""
              }`}
              onClick={() => handleSelectSinger(singer.name)}
            >
              <UserCheck size={14} />
              <span>{singer.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Singer Banner ──────────────────────────── */}
      <div className="artist-header-bg">
        <img src={coverImage} alt={`${artistName} Cover`} />
        <div className="artist-header-overlay">
          <div className="verified-badge">✓ Nghệ Sĩ / Ca Sĩ Tìm Kiếm</div>
          <h1 className="artist-title">{artistName}</h1>
          <p className="monthly-listeners">
            Danh sách bài hát Karaoke mới nhất & phổ biến nhất của {artistName}
          </p>
        </div>
      </div>

      {/* ─── Actions Bar ────────────────────────────── */}
      <div className="artist-actions">
        <button
          className="btn btn-primary play-all-btn"
          title="Phát tất cả bài hát"
          onClick={handlePlayAll}
          disabled={topTracks.length === 0}
        >
          <Play size={24} fill="black" />
        </button>
        <button className="btn btn-follow" onClick={() => alert(`Đã theo dõi ${artistName}`)}>
          Theo dõi Ca Sĩ
        </button>
      </div>

      {/* ─── Songs List Section ──────────────────────── */}
      <div className="artist-content">
        <div className="section-title">
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", marginBottom: "1rem" }}>
            Các Bài Hát Karaoke Của Ca Sĩ "{artistName}"{" "}
            {isLoading && (
              <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: "normal" }}>
                (Đang tải kết quả...)
              </span>
            )}
          </h2>
        </div>

        <div className="tracks-list">
          {topTracks.length > 0 ? (
            topTracks.map((track, idx) => (
              <div
                className="track-row"
                key={track.id}
                onClick={() => handlePlaySong(track)}
              >
                <div className="track-index">{idx + 1}</div>
                <div className="track-img">
                  <img
                    src={
                      track.thumbnail ||
                      "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=100&auto=format&fit=crop"
                    }
                    alt={track.title}
                  />
                  <Play className="track-play-icon" size={16} fill="white" />
                </div>
                <div className="track-title-block">
                  <div className="track-title">{track.title}</div>
                  <div className="track-channel">{track.channelTitle}</div>
                </div>
                <div className="track-actions-cell">
                  <button
                    className="btn icon-btn track-queue-btn"
                    title="Thêm vào hàng đợi"
                    onClick={(e) => handleQueueSong(e, track)}
                  >
                    <Plus size={18} />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            !isLoading && (
              <div className="artist-empty-state">
                <Mic2 size={40} style={{ opacity: 0.5, marginBottom: "1rem" }} />
                <p>Không tìm thấy bài hát karaoke nào của ca sĩ "{artistName}".</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                  Hãy thử gõ tên ca sĩ khác hoặc kiểm tra lại từ khóa tìm kiếm!
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Artist;

