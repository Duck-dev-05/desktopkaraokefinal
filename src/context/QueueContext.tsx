import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { YoutubeVideo } from '../api/youtube';

export interface QueuedVideo extends YoutubeVideo {
  queueId: string; // Unique ID for the queue instance (so you can queue the same song twice)
}

interface QueueContextType {
  queue: QueuedVideo[];
  addToQueue: (video: YoutubeVideo) => void;
  removeFromQueue: (queueId: string) => void;
  clearQueue: () => void;
  notify: (message: string) => void;
}

const Toast = ({ message }: { message: string }) => (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#333',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    animation: 'slideIn 0.3s ease-out forwards',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'Inter, system-ui, sans-serif'
  }}>
    <span style={{ color: '#4ade80' }}>✓</span>
    {message}
    <style>{`
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `}</style>
  </div>
);

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider = ({ children }: { children: ReactNode }) => {
  const [queue, setQueue] = useState<QueuedVideo[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel('karaoke_queue_sync');
    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'SYNC_QUEUE') {
        setQueue(payload.queue);
      }
    };
    return () => channel.close();
  }, []);

  const syncQueue = (newQueue: QueuedVideo[]) => {
    setQueue(newQueue);
    const channel = new BroadcastChannel('karaoke_queue_sync');
    channel.postMessage({ type: 'SYNC_QUEUE', payload: { queue: newQueue } });
    channel.close();
  };

  const notify = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const addToQueue = (video: YoutubeVideo) => {
    const queuedVideo: QueuedVideo = {
      ...video,
      queueId: Math.random().toString(36).substr(2, 9),
    };
    const newQueue = [...queue, queuedVideo];
    syncQueue(newQueue);
    
    // Show notification
    notify(`Added "${video.title}" to queue`);
  };

  const removeFromQueue = (queueId: string) => {
    const newQueue = queue.filter((v) => v.queueId !== queueId);
    syncQueue(newQueue);
  };

  const clearQueue = () => {
    syncQueue([]);
  };

  return (
    <QueueContext.Provider value={{ queue, addToQueue, removeFromQueue, clearQueue, notify }}>
      {children}
      {notification && <Toast message={notification} />}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};
