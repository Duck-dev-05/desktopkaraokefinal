import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { availableMonitors, primaryMonitor, LogicalPosition } from '@tauri-apps/api/window';
import BottomNav from "../components/BottomNav";

const SIDEBAR_STORAGE_KEY = "karaoke_sidebar_collapsed";

const MainLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const { isTheaterMode, hasMultipleMonitors } = useDeviceDetection();

  // Auto-collapse sidebar when secondary display is connected
  useEffect(() => {
    if (hasMultipleMonitors) {
      setSidebarCollapsed(true);
    }
  }, [hasMultipleMonitors]);



  return (
    <div className={`app-container ${isTheaterMode ? "theater-mode" : ""}`}>
      <div className="app-background" />
      <div className="app-background-mid" />
      <div className="app-content-wrapper">
        {!hasMultipleMonitors && <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
        <div className="main-area">
          <TopBar sidebarCollapsed={hasMultipleMonitors || sidebarCollapsed} />
          <main className="main-content" style={{ paddingBottom: hasMultipleMonitors ? '160px' : 'var(--space-10)' }}>
            <Outlet />
          </main>
        </div>
      </div>
      {hasMultipleMonitors && <BottomNav />}
    </div>
  );
};

export default MainLayout;
