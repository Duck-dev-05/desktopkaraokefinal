import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Playlist from "./pages/Playlist";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Artist from "./pages/Artist";
import Queue from "./pages/Queue";
import Party from "./pages/Party";

import Explore from "./pages/Explore";
import History from "./pages/History";
import Recordings from "./pages/Recordings";
import Downloads from "./pages/Downloads";
import LocalMedia from "./pages/LocalMedia";
import Premium from "./pages/Premium";
import { initDB } from "./db";

import { PlayerProvider } from "./context/PlayerContext";
import { QueueProvider } from "./context/QueueContext";
import { PartyProvider } from "./context/PartyContext";
import { HistoryProvider } from "./context/HistoryContext";
import GlobalPlayer from "./components/GlobalPlayer";
import RemoteControl from "./components/RemoteControl";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import Updater, { UpdaterProvider } from "./components/Updater";

function App() {
  const [isPlayerWindow, setIsPlayerWindow] = useState(false);

  useEffect(() => {
    initDB().then(() => console.log("Database initialized")).catch(console.error);
    
    // Check if this is the player window
    if (window.__TAURI_INTERNALS__) {
      const appWindow = getCurrentWindow();
      if (appWindow.label === 'karaoke-player') {
        setIsPlayerWindow(true);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <UpdaterProvider>
        <AuthProvider>
          <PlayerProvider>
            <QueueProvider>
              <HistoryProvider>
                <PartyProvider>
                  {isPlayerWindow ? (
                    <GlobalPlayer />
                  ) : (
                    <Router>
                      <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<MainLayout />}>
                      {/* Public Routes */}
                      <Route index element={<Home />} />
                      <Route path="explore" element={<Explore />} />
                      <Route path="artist" element={<Artist />} />
                      <Route path="premium" element={<Premium />} />

                      {/* Protected Routes (Require Login) */}
                      <Route path="queue" element={<ProtectedRoute><Queue /></ProtectedRoute>} />
                      <Route path="party" element={<ProtectedRoute><Party /></ProtectedRoute>} />
                      <Route path="history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                      <Route path="recordings" element={<ProtectedRoute><Recordings /></ProtectedRoute>} />
                      <Route path="downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
                      <Route path="local-media" element={<ProtectedRoute><LocalMedia /></ProtectedRoute>} />
                      <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="playlist/:id" element={<ProtectedRoute><Playlist /></ProtectedRoute>} />
                      <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                      {/* Catch-all route to prevent black screen on unknown URLs */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>

                  {/* Persistent Global Player (Remote Control for main window) */}
                  <RemoteControl />
                  <NetworkStatus />
                  <Updater />

                </Router>
                )}
                </PartyProvider>
              </HistoryProvider>
            </QueueProvider>
          </PlayerProvider>
        </AuthProvider>
      </UpdaterProvider>
    </ErrorBoundary>
  );
}

export default App;
