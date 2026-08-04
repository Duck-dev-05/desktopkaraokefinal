import { Bell, Search, User as UserIcon, LogOut, Settings, Cast, MonitorPlay } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isTheaterMode } = useDeviceDetection();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue("");
      inputRef.current?.blur();
    }
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

  const handleTheaterModeClick = async () => {
    try {
      if (window.__TAURI_INTERNALS__) {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const appWindow = getCurrentWindow();
        const isFullscreen = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!isFullscreen);
      } else {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Failed to toggle fullscreen:', err);
    }
  };

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
          onBlur={() => setIsFocused(false)}
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

      {/* Right: Actions */}
      <div className="topbar-right">
        {isTheaterMode && (
          <div 
            className="theater-mode-badge animate-fade-in" 
            title="Chế độ màn hình lớn đang bật. Nhấn để bật/tắt toàn màn hình."
            onClick={handleTheaterModeClick}
          >
            <MonitorPlay size={16} />
            <span>Theater Mode</span>
          </div>
        )}

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
