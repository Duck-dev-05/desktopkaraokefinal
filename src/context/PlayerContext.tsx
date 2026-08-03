import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { YoutubeVideo } from '../api/youtube';
import { useAuth } from './AuthContext';

interface PlayerContextType {
  currentVideo: YoutubeVideo | null;
  isPlaying: boolean;
  audioOffset: number;
  setAudioOffset: (offset: number) => void;
  playVideo: (video: YoutubeVideo) => void;
  pauseVideo: () => void;
  resumeVideo: () => void;
  closePlayer: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentVideo, setCurrentVideo] = useState<YoutubeVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioOffset, setAudioOffset] = useState<number>(0);
  const { user } = useAuth();

  useEffect(() => {
    const channel = new BroadcastChannel('karaoke_player_sync');
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'PLAY_VIDEO') {
        setCurrentVideo(payload.video);
        setIsPlaying(true);
      } else if (type === 'PAUSE_VIDEO') {
        setIsPlaying(false);
      } else if (type === 'RESUME_VIDEO') {
        setIsPlaying(true);
      } else if (type === 'CLOSE_PLAYER') {
        setCurrentVideo(null);
        setIsPlaying(false);
      } else if (type === 'SET_AUDIO_OFFSET') {
        setAudioOffset(payload.offset);
      }
    };
    return () => channel.close();
  }, []);

  const broadcast = (type: string, payload?: any) => {
    const channel = new BroadcastChannel('karaoke_player_sync');
    channel.postMessage({ type, payload });
    channel.close();
  };

  const playVideo = (video: YoutubeVideo) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    broadcast('PLAY_VIDEO', { video });
  };

  const pauseVideo = () => {
    setIsPlaying(false);
    broadcast('PAUSE_VIDEO');
  };
  
  const resumeVideo = () => {
    setIsPlaying(true);
    broadcast('RESUME_VIDEO');
  };
  
  const closePlayer = () => {
    setCurrentVideo(null);
    setIsPlaying(false);
    broadcast('CLOSE_PLAYER');
  };

  const setAudioOffsetSync = (offset: number) => {
    setAudioOffset(offset);
    broadcast('SET_AUDIO_OFFSET', { offset });
  };

  return (
    <PlayerContext.Provider
      value={{
        currentVideo,
        isPlaying,
        audioOffset,
        setAudioOffset: setAudioOffsetSync,
        playVideo,
        pauseVideo,
        resumeVideo,
        closePlayer,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
