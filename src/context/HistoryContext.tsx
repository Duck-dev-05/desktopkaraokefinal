import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { YoutubeVideo } from '../api/youtube';

interface HistoryContextType {
  history: YoutubeVideo[];
  addToHistory: (video: YoutubeVideo) => void;
  clearHistory: () => void;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider = ({ children }: { children: ReactNode }) => {
  const [history, setHistory] = useState<YoutubeVideo[]>([]);

  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('karaoke_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse history:', err);
      }
    }
  }, []);

  const addToHistory = (video: YoutubeVideo) => {
    setHistory((prevHistory) => {
      // Remove duplicates
      const filtered = prevHistory.filter((v) => v.id !== video.id);
      // Add new video to the top
      const newHistory = [video, ...filtered].slice(0, 50); // Keep max 50 items
      
      localStorage.setItem('karaoke_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('karaoke_history');
  };

  return (
    <HistoryContext.Provider value={{ history, addToHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};
