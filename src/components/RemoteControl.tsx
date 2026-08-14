import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, X, Tv } from 'lucide-react';
import { useQueue } from '../context/QueueContext';
import '../pages/SingView.css';

import { useDeviceDetection } from '../hooks/useDeviceDetection';

const RemoteControl = () => {
  const { currentVideo, isPlaying, playVideo, pauseVideo, resumeVideo, closePlayer } = usePlayer();
  const { queue, removeFromQueue } = useQueue();
  const { hasMultipleMonitors } = useDeviceDetection();

  if (!currentVideo) return null;

  const handleSkip = () => {
    if (queue.length > 0) {
      const nextSong = queue[0];
      removeFromQueue(nextSong.queueId);
      playVideo(nextSong);
    } else {
      closePlayer();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: hasMultipleMonitors ? '65px' : 0,
      left: 0,
      right: 0,
      height: '90px',
      backgroundColor: 'rgba(20, 20, 20, 0.95)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 9999,
      color: 'white',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <img 
          src={currentVideo.thumbnail} 
          alt={currentVideo.title} 
          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} 
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
          <span style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentVideo.title}
          </span>
          <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
            {currentVideo.channelTitle}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, justifyContent: 'center' }}>
        <button 
          onClick={isPlaying ? pauseVideo : resumeVideo}
          style={{
            background: 'white',
            color: 'black',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} fill="black" />}
        </button>

        <button 
          onClick={handleSkip}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7
          }}
        >
          <SkipForward size={24} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a1a1aa', fontSize: '12px', marginRight: '16px' }}>
          <Tv size={16} />
          Playing on External Display
        </div>
        <button 
          onClick={closePlayer}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            opacity: 0.7
          }}
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default RemoteControl;
