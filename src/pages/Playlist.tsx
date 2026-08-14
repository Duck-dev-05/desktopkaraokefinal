import { useEffect, useState } from "react";
import { Play, MoreHorizontal, Plus, Shuffle, Heart, Mic2, ChevronRight, Clock, Music } from "lucide-react";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import { usePlayer } from "../context/PlayerContext";
import { useQueue } from "../context/QueueContext";
import "./Playlist.css";

const COVER_URL =
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop";

const Playlist = () => {
  const [playlistSongs, setPlaylistSongs] = useState<YoutubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const { currentVideo, playVideo } = usePlayer();
  const { addToQueue } = useQueue();

  useEffect(() => {
    searchYoutubeKaraoke("karaoke party classics")
      .then((res) => {
        setPlaylistSongs(res);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handlePlayAll = () => {
    if (playlistSongs.length === 0) return;
    playVideo(playlistSongs[0]);
    playlistSongs.slice(1).forEach((song) => addToQueue(song));
  };

  const handleShuffle = () => {
    const shuffled = [...playlistSongs].sort(() => Math.random() - 0.5);
    if (shuffled.length === 0) return;
    playVideo(shuffled[0]);
    shuffled.slice(1).forEach((song) => addToQueue(song));
  };

  const handleSongClick = (song: YoutubeVideo) => {
    if (currentVideo) {
      addToQueue(song);
    } else {
      playVideo(song);
    }
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLiked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isPlaying = (song: YoutubeVideo) => currentVideo?.id === song.id;

  return (
    <div className="pl-page">
      {/* ── Blurred Hero ──────────────────────────────────── */}
      <div className="pl-hero">
        <div
          className="pl-hero-bg"
          style={{ backgroundImage: `url(${COVER_URL})` }}
        />
        <div className="pl-hero-gradient" />

        <div className="pl-hero-content">
          {/* Cover art */}
          <div className="pl-cover-wrap">
            <img src={COVER_URL} alt="Playlist Cover" className="pl-cover" />
            <div className="pl-cover-glow" />
          </div>

          {/* Meta */}
          <div className="pl-meta">
            <span className="pl-type-badge">Danh Sách Phát</span>
            <h1 className="pl-title">Karaoke Party Classics</h1>
            <p className="pl-description">
              Tuyển tập các bài hát được yêu thích nhất. Hãy sẵn sàng hát hết mình!
            </p>
            <div className="pl-info-row">
              <span className="pl-author">KaraokePro</span>
              <span className="pl-dot">·</span>
              <span className="pl-count">
                {isLoading ? "Đang tải..." : `${playlistSongs.length} bài hát`}
              </span>
            </div>

            {/* Actions */}
            <div className="pl-actions">
              <button className="pl-btn-play" onClick={handlePlayAll}>
                <Play size={22} fill="white" strokeWidth={0} />
                Phát Tất Cả
              </button>
              <button className="pl-btn-shuffle" onClick={handleShuffle} title="Phát ngẫu nhiên">
                <Shuffle size={18} />
              </button>
              <button className="pl-btn-icon" title="Thêm vào thư viện">
                <Plus size={18} />
              </button>
              <button className="pl-btn-icon" title="Thêm tùy chọn">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Song List ─────────────────────────────────────── */}
      <div className="pl-list-section">
        {/* List Header */}
        <div className="pl-list-header">
          <span className="plh-num">#</span>
          <span className="plh-title">Tiêu Đề</span>
          <span className="plh-source">Nguồn</span>
          <span className="plh-time"><Clock size={14} /></span>
        </div>
        <div className="pl-divider" />

        {/* Skeleton loading */}
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pl-row pl-skeleton">
              <div className="pls-num" />
              <div className="pls-thumb" />
              <div className="pls-info">
                <div className="pls-title-bar" style={{ width: `${55 + Math.random() * 35}%` }} />
                <div className="pls-sub-bar" style={{ width: `${30 + Math.random() * 25}%` }} />
              </div>
            </div>
          ))}

        {/* Songs */}
        {!isLoading && playlistSongs.map((song, idx) => (
          <div
            key={song.id}
            className={`pl-row ${isPlaying(song) ? "pl-row--playing" : ""}`}
            onClick={() => handleSongClick(song)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Number / Play icon */}
            <div className="pl-row-num">
              {hoveredIdx === idx || isPlaying(song) ? (
                isPlaying(song)
                  ? <Music size={16} className="pl-icon-playing" />
                  : <Play size={15} fill="white" strokeWidth={0} />
              ) : (
                <span className={isPlaying(song) ? "pl-num-active" : ""}>{idx + 1}</span>
              )}
            </div>

            {/* Thumbnail */}
            <div className="pl-row-thumb-wrap">
              <img
                src={song.thumbnail || "/no_thumbnail.jpg"}
                alt={song.title}
                className="pl-row-thumb"
              />
              {hoveredIdx === idx && (
                <div className="pl-row-thumb-overlay">
                  <Mic2 size={16} color="white" />
                </div>
              )}
            </div>

            {/* Title & artist */}
            <div className="pl-row-info">
              <span className={`pl-row-title ${isPlaying(song) ? "pl-row-title--active" : ""}`}>
                {song.title}
              </span>
              <span className="pl-row-artist">{song.channelTitle}</span>
            </div>

            {/* Source */}
            <span className="pl-row-source">YouTube</span>

            {/* Like + duration */}
            <div className="pl-row-right">
              <button
                className={`pl-row-like ${liked.has(song.id) ? "liked" : ""}`}
                onClick={(e) => toggleLike(e, song.id)}
                title={liked.has(song.id) ? "Bỏ yêu thích" : "Yêu thích"}
              >
                <Heart size={14} fill={liked.has(song.id) ? "currentColor" : "none"} />
              </button>
              <span className="pl-row-dur">--:--</span>
              <ChevronRight size={14} className="pl-row-chevron" />
            </div>
          </div>
        ))}

        {!isLoading && playlistSongs.length === 0 && (
          <div className="pl-empty">
            <Music size={40} />
            <p>Danh sách phát này chưa có bài hát nào.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlist;
