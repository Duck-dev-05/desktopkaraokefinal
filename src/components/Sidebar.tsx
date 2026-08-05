import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Settings,
  Mic2,
  ListVideo,
  LogIn,
  Compass,
  Download,
  History as HistoryIcon,
  Mic,
  Users,
  Crown,
  FolderUp,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useParty } from "../context/PartyContext";
import "./Sidebar.css";

// ─── Types ──────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  extra?: string;
  collapsed?: boolean;
  requiresAuth?: boolean;
  user?: any;
  disabled?: boolean;
}

interface SectionLabelProps {
  children: string;
  collapsed: boolean;
  open?: boolean;
  onToggle?: () => void;
}

// ─── Sub-components (defined OUTSIDE Sidebar to prevent crashes) ──
const NavItem = ({
  to, icon, label, badge,
  disabled = false, extra = "", collapsed = false, requiresAuth = false, user = null
}: NavItemProps) => {
  const finalTo = (requiresAuth && !user) ? '/login' : to;

  return (
    <NavLink
      to={finalTo}
      className={({ isActive }) =>
        `nav-item ${isActive && finalTo !== '/login' ? "active" : ""} ${disabled ? "disabled" : ""} ${extra}`.trim()
      }
      onClick={(e) => disabled && e.preventDefault()}
      title={collapsed ? label : undefined}
    >
    <span className="nav-icon">{icon}</span>
    {!collapsed && (
      <>
        <span className="nav-label">{label}</span>
        {badge && <span className="nav-badge">{badge}</span>}
      </>
    )}
      {collapsed && badge && <span className="nav-badge-dot" />}
    </NavLink>
  );
};

const SectionLabel = ({ children, collapsed, open, onToggle }: SectionLabelProps) => {
  if (collapsed) return <div className="section-divider" />;
  if (onToggle !== undefined) {
    return (
      <button className="nav-section-label collapsible" onClick={onToggle}>
        <span>{children}</span>
        <ChevronDown size={12} className={`chevron ${open ? "open" : ""}`} />
      </button>
    );
  }
  return <span className="nav-section-label">{children}</span>;
};

// ─── Sidebar ─────────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user } = useAuth();
  const { roomId } = useParty();
  const [isOffline, setIsOffline]     = useState(!navigator.onLine);
  const [isMyMusicOpen, setIsMyMusicOpen] = useState(true);
  const [isToolsOpen, setIsToolsOpen]   = useState(false);

  useEffect(() => {
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      {/* ── HEADER ───────────────────────────────── */}
      <div className="sidebar-header">
        <div className="logo-wrap">
          <div className="logo-badge" style={{ background: 'transparent', padding: 0 }}>
            <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          </div>
          {!collapsed && (
            <div className="logo-text-wrap animate-fade-in">
              <span className="logo-name">Karaoke</span>
              <span className="logo-accent">Pro</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-toggle-btn"
          onClick={onToggle}
          title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        </button>
      </div>

      {/* ── STATUS BAR ───────────────────────────── */}
      {!collapsed && (
        <div className={`status-bar animate-fade-in ${isOffline ? "offline" : "online"}`}>
          {isOffline
            ? <><WifiOff size={12} /><span>Ngoại tuyến</span></>
            : <><Wifi size={12} /><span>Đang kết nối</span></>
          }
          {roomId && (
            <span className="room-chip">
              <Radio size={10} />
              Room Live
            </span>
          )}
        </div>
      )}

      {/* ── SCROLL AREA ──────────────────────────── */}
      <div className="sidebar-scroll-content">

        {/* MAIN NAV */}
        <div className="nav-group">
          <SectionLabel collapsed={collapsed}>ĐIỀU HƯỚNG</SectionLabel>
          <nav className="nav-list">
            <NavItem to="/"        icon={<Home size={18} />}      label="Trang Chủ"  disabled={isOffline} collapsed={collapsed} />
            <NavItem to="/explore" icon={<Compass size={18} />}   label="Khám Phá"   disabled={isOffline} collapsed={collapsed} />
            <NavItem to="/queue"   icon={<ListVideo size={18} />} label="Hàng Đợi"                       collapsed={collapsed} />
            <NavItem
              to="/party"
              icon={<Users size={18} />}
              label="Hát Cùng Nhau"
              badge={roomId ? "LIVE" : undefined}
              extra={roomId ? "party-active" : ""}
              requiresAuth={true}
              user={user}
              collapsed={collapsed}
            />
            {(() => {
              const hasActiveSubscription = user?.role && !['user', 'admin', 'free_plan'].includes(user.role);
              return (
                <NavItem 
                  to="/premium" 
                  icon={<Crown size={18} />} 
                  label={hasActiveSubscription ? "Quản Lý Gói" : "Premium"} 
                  extra={hasActiveSubscription ? "" : "premium-link"} 
                  collapsed={collapsed} 
                />
              );
            })()}
          </nav>
        </div>

        {/* MY MUSIC */}
        <div className="nav-group">
          <SectionLabel
            collapsed={collapsed}
            open={isMyMusicOpen}
            onToggle={() => setIsMyMusicOpen(v => !v)}
          >
            NHẠC CỦA TÔI
          </SectionLabel>
          {(isMyMusicOpen || collapsed) && (
            <nav className="nav-list">
              <NavItem to="/history"     icon={<HistoryIcon size={18} />} label="Lịch Sử"        requiresAuth={true} user={user} collapsed={collapsed} />
              <NavItem to="/recordings"  icon={<Mic size={18} />}         label="Bản Thu"         requiresAuth={true} user={user} collapsed={collapsed} />
              <NavItem to="/downloads"   icon={<Download size={18} />}    label="Tải Xuống"       requiresAuth={true} user={user} collapsed={collapsed} />
            </nav>
          )}
        </div>

        {/* TOOLS */}
        <div className="nav-group">
          <SectionLabel
            collapsed={collapsed}
            open={isToolsOpen}
            onToggle={() => setIsToolsOpen(v => !v)}
          >
            CÔNG CỤ
          </SectionLabel>
          {(isToolsOpen || collapsed) && (
            <nav className="nav-list">
              <NavItem to="/local-media"    icon={<FolderUp size={18} />} label="Nhạc Nội Bộ" collapsed={collapsed} />
            </nav>
          )}
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────── */}
      <div className="sidebar-footer">
        {user ? (
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `user-card ${isActive ? "active" : ""} ${isOffline ? "disabled" : ""} ${collapsed ? "collapsed" : ""}`.trim()
            }
            onClick={(e) => isOffline && e.preventDefault()}
            title={collapsed ? user.username : undefined}
          >
            <div className="user-avatar-wrap">
              <img
                src={user.avatar_url}
                alt="Profile"
                referrerPolicy="no-referrer"
                className="user-avatar"
              />
              <span className="user-online-dot" />
            </div>
            {!collapsed && (
              <div className="user-info animate-fade-in">
                <span className="user-name">{user.username}</span>
                <span className={`user-role ${
                  user.role === 'premium' ? 'role-premium' :
                  user.role === 'studio'  ? 'role-studio'  :
                  'role-free'
                }`}>
                  {user.role === 'premium' ? '⭐ Premium' :
                   user.role === 'studio'  ? '🎙️ Studio Pro' :
                   user.role === 'admin'   ? '🛡️ Admin' :
                   '🎵 Free Plan'}
                </span>
              </div>
            )}
          </NavLink>
        ) : (
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `nav-item login-item ${isActive ? "active" : ""} ${isOffline ? "disabled" : ""}`.trim()
            }
            onClick={(e) => isOffline && e.preventDefault()}
            title={collapsed ? "Đăng Nhập" : undefined}
          >
            <span className="nav-icon"><LogIn size={18} /></span>
            {!collapsed && <span className="nav-label">Đăng Nhập</span>}
          </NavLink>
        )}

        <div className="footer-nav">

          <NavLink
            to="/settings"
            className={({ isActive }) => `footer-nav-item ${isActive ? "active" : ""}`}
            title={collapsed ? "Cài Đặt" : undefined}
          >
            <Settings size={16} />
            {!collapsed && <span>Cài Đặt</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
