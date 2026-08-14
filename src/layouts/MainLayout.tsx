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

  // Auto-open TV display when second monitor or amplifier is detected
  useEffect(() => {
    const checkAndSpawn = async () => {
      if (hasMultipleMonitors && window.__TAURI_INTERNALS__) {
        const hasAutoOpened = sessionStorage.getItem('auto_opened_tv');
        if (!hasAutoOpened) {
          try {
            const monitors = await availableMonitors();
            const primary = await primaryMonitor();
            
            let x: number | undefined;
            let y: number | undefined;
            
            // Find a monitor that isn't the primary one
            const secondMonitor = monitors.find(m => m.name !== primary?.name);
            if (secondMonitor) {
              const logicalPos = secondMonitor.position.toLogical(secondMonitor.scaleFactor);
              x = logicalPos.x;
              y = logicalPos.y;
            }

            let webview = await WebviewWindow.getByLabel('karaoke-player');
            
            if (webview) {
              // Window already exists, just move and maximize it
              if (x !== undefined && y !== undefined) {
                await webview.setPosition(new LogicalPosition(x, y));
              }
              await webview.show();
              await webview.maximize();
            } else {
              // Create new window
              const windowOptions: any = {
                url: '/',
                title: 'Karaoke TV Display',
                width: 1280,
                height: 720,
                decorations: true,
                maximized: true // Start maximized for better experience
              };
              
              if (x !== undefined && y !== undefined) {
                windowOptions.x = x;
                windowOptions.y = y;
              } else {
                windowOptions.center = true;
              }

              webview = new WebviewWindow('karaoke-player', windowOptions);
              
              webview.once('tauri://error', function (e) {
                console.error('Error creating player window:', e);
              });
            }
            
            sessionStorage.setItem('auto_opened_tv', 'true');
          } catch (e) {
            console.error("Failed to auto-open TV Display", e);
          }
        }
      }
    };
    
    checkAndSpawn();
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
