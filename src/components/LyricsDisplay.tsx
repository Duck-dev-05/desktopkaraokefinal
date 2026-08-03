import React, { useEffect, useRef, useState } from 'react';
import './LyricsDisplay.css';

interface LrcLine {
  time: number; // in seconds
  text: string;
}

interface LyricsDisplayProps {
  lrcText: string;
  currentTime: number;
}

const parseLrc = (lrcString: string): LrcLine[] => {
  const lines = lrcString.split('\n');
  const parsedLines: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
      const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
      const text = line.replace(timeRegex, '').trim();
      
      // Only add non-empty lines for the display
      if (text) {
        parsedLines.push({ time: timeInSeconds, text });
      }
    }
  }
  return parsedLines;
};

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ lrcText, currentTime }) => {
  const [lyrics, setLyrics] = useState<LrcLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (lrcText) {
      setLyrics(parseLrc(lrcText));
    }
  }, [lrcText]);

  useEffect(() => {
    if (lyrics.length === 0) return;

    let newActiveIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        newActiveIndex = i;
      } else {
        break; // Lyrics are sorted by time, so we can stop early
      }
    }

    if (newActiveIndex !== activeIndex) {
      setActiveIndex(newActiveIndex);
      
      // Auto-scroll to the active line
      if (newActiveIndex !== -1 && containerRef.current) {
        const activeLineElement = lineRefs.current[newActiveIndex];
        const container = containerRef.current;
        
        if (activeLineElement) {
          // Calculate the scroll position to center the active line
          const scrollTarget = activeLineElement.offsetTop - container.clientHeight / 2 + activeLineElement.clientHeight / 2;
          
          container.scrollTo({
            top: scrollTarget,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentTime, lyrics, activeIndex]);

  if (!lrcText || lyrics.length === 0) {
    return (
      <div className="lyrics-display-empty">
        <p>No lyrics available for this track.</p>
      </div>
    );
  }

  return (
    <div className="lyrics-display-container" ref={containerRef}>
      <div className="lyrics-display-spacer" />
      {lyrics.map((line, index) => {
        const isActive = index === activeIndex;
        const isPast = index < activeIndex;
        
        return (
          <div
            key={index}
            ref={el => { lineRefs.current[index] = el; }}
            className={`lyrics-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
          >
            {line.text}
          </div>
        );
      })}
      <div className="lyrics-display-spacer" />
    </div>
  );
};

export default LyricsDisplay;
