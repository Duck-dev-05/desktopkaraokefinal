import { Bell, Search, User as UserIcon, LogOut, Settings, Cast, MonitorPlay, Tv2, Plus } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import { usePlayer } from "../context/PlayerContext";
import { useQueue } from "../context/QueueContext";
import { useParty } from "../context/PartyContext";
import { Loader2 } from "lucide-react";
import { openUrl } from '@tauri-apps/plugin-opener';
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import "./TopBar.css";

interface TopBarProps {
  sidebarCollapsed: boolean;
}

const TopBar = ({ sidebarCollapsed }: TopBarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<YoutubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const { playVideo } = usePlayer();
  const { addToQueue: localAddToQueue } = useQueue();
  const { roomId, addSongToPartyQueue } = useParty();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hdmiNotice, setHdmiNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autoFullscreenDone = useRef(false); // prevent repeated auto-trigger
  const { isTheaterMode, hasMultipleMonitors, hasAmplifier } = useDeviceDetection();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node) && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchValue.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchYoutubeKaraoke(searchValue);
        setSearchResults(results.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);

  // Sync fullscreen state with browser/Tauri
  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  // Auto-activate Theater Mode when HDMI / external display is detected
  useEffect(() => {
    if (!isTheaterMode) {
      // Device unplugged — reset so next plug-in triggers again
      autoFullscreenDone.current = false;
      return;
    }
    if (autoFullscreenDone.current) return; // already triggered this session
    autoFullscreenDone.current = true;

    const label = hasMultipleMonitors
      ? 'Màn hình ngoài'
      : hasAmplifier
      ? 'Thiết bị âm thanh HDMI'
      : 'Thiết bị ngoài';

    const activate = async () => {
      try {
        if (window.__TAURI_INTERNALS__) {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const appWindow = getCurrentWindow();
          const already = await appWindow.isFullscreen();
          if (!already) {
            await appWindow.setFullscreen(true);
            setIsFullscreen(true);
          }
        } else if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        }
        setHdmiNotice(`🖥️ ${label} detected — Theater Mode ON`);
        setTimeout(() => setHdmiNotice(null), 4000);
      } catch (err) {
        console.error('Auto Theater Mode failed:', err);
      }
    };

    activate();
  }, [isTheaterMode, hasMultipleMonitors, hasAmplifier]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handlePlay(searchResults[0]);
    }
  };

  const handlePlay = (video: YoutubeVideo) => {
    playVideo(video);
    setSearchValue("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleQueue = (e: React.MouseEvent, video: YoutubeVideo) => {
    e.stopPropagation();
    e.preventDefault();
    if (roomId) {
      addSongToPartyQueue(video);
    } else {
      localAddToQueue(video);
    }
    setSearchValue("");
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleCastClick = async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        // Opens the Windows "Connect" menu for wireless displays (equivalent to Win + K on Windows 10/11)
        await openUrl('ms-settings-connectabledevices:devicediscovery');
      } else {
        alert('Casting is only supported in the Desktop App.');
      }
    } catch (err) {
      console.error('Failed to open cast menu:', err);
    }
  };

  const handleTheaterModeClick = useCallback(async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        const currentlyFullscreen = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!currentlyFullscreen);
        setIsFullscreen(!currentlyFullscreen);
      } else {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  }, []);

  return (
    <header className={`topbar glass ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Left: App branding (shows when sidebar is collapsed) */}
      <div className="topbar-left">
        {sidebarCollapsed && (
          <div className="topbar-brand animate-fade-in">
            <span className="topbar-brand-icon">🎤</span>
            <span className="topbar-brand-name">
              Karaoke<span className="topbar-brand-highlight">Pro</span>
            </span>
          </div>
        )}
      </div>

      {/* Center: Search Bar */}
      <div className="topbar-search-wrapper" ref={searchDropdownRef}>
        <form
          className={`topbar-search ${isFocused ? "focused" : ""}`}
          onSubmit={handleSearchSubmit}
        >
          <Search size={16} className="topbar-search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm kiếm bài hát, nghệ sĩ..."
            className="topbar-search-input"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
          />
          {searchValue && (
            <button
              type="button"
              className="topbar-search-clear"
              onClick={() => setSearchValue("")}
            >
              ✕
            </button>
          )}
        </form>
        
        {isFocused && searchValue.trim() && (
          <div className="topbar-search-dropdown animate-fade-in">
            {isSearching ? (
              <div className="topbar-search-loading">
                <Loader2 size={20} className="spin" />
                <span>Đang tìm kiếm...</span>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="topbar-search-results">
                {searchResults.map((video) => (
                  <div 
                    key={video.id} 
                    className="topbar-search-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handlePlay(video);
                    }}
                  >
                    <img src={video.thumbnail} alt={video.title} />
                    <div className="topbar-search-item-info">
                      <div className="topbar-search-item-title">{video.title}</div>
                      <div className="topbar-search-item-channel">{video.channelTitle}</div>
                    </div>
                    <button 
                      className="btn icon-btn" 
                      title="Thêm vào hàng đợi"
                      onMouseDown={(e) => handleQueue(e, video)}
                      style={{ padding: '6px', marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="topbar-search-empty">
                Không tìm thấy kết quả nào.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="topbar-right">
        {/* HDMI / external device auto-detected notice */}
        {hdmiNotice && (
          <div className="hdmi-notice animate-fade-in">
            <Tv2 size={14} />
            <span>{hdmiNotice}</span>
          </div>
        )}

        <button
          className={`theater-mode-badge${isFullscreen ? " active" : ""}${isTheaterMode && !isFullscreen ? " hdmi-ready" : ""}`}
          title={
            isFullscreen
              ? "Thoát chế độ toàn màn hình"
              : isTheaterMode
              ? "Thiết bị ngoài đã kết nối — Nhấn để bật Theater Mode"
              : "Bật Theater Mode (Toàn màn hình)"
          }
          onClick={handleTheaterModeClick}
        >
          <MonitorPlay size={16} />
          <span>Theater Mode</span>
        </button>

        <button className="topbar-icon-btn" title="Kết nối màn hình không dây (Win + K)" onClick={handleCastClick}>
          <Cast size={18} />
        </button>

        <button className="topbar-icon-btn" title="Thông báo">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

        {user ? (
          <div className="topbar-user-menu" ref={dropdownRef}>
            <button
              className="topbar-user-btn"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              title={user.username}
            >
              <img
                src={user.avatar_url}
                alt={user.username}
                className="topbar-user-avatar"
                referrerPolicy="no-referrer"
              />
              <span className="topbar-user-name">{user.username}</span>
            </button>
            
            {isDropdownOpen && (
              <div className="profile-dropdown animate-scale-in">
                <div className="profile-dropdown-header">
                  <span className="dropdown-username">{user.username}</span>
                  <span className="dropdown-email">{user.role === 'premium' ? 'Premium VIP' : user.role === 'studio' ? 'Studio Pro' : 'Thành viên miễn phí'}</span>
                </div>
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-item" 
                  onClick={() => { setIsDropdownOpen(false); navigate("/profile"); }}
                >
                  <UserIcon size={16} /> Hồ sơ của tôi
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => { setIsDropdownOpen(false); navigate("/settings"); }}
                >
                  <Settings size={16} /> Cài đặt
                </button>
                <div className="dropdown-divider"></div>
                <button 
                  className="dropdown-item text-danger" 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    logout();
                    navigate("/");
                  }}
                >
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary topbar-login-btn"
            onClick={() => navigate("/login")}
          >
            Đăng Nhập
          </button>
        )}
      </div>
    </header>
  );
};

export default TopBar;
