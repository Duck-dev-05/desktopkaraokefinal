import { useState, useEffect } from "react";
import { Sliders, Music, Clock } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import "./PitchTempoControls.css";

const PitchTempoControls = () => {
  const { currentVideo, isPlaying } = usePlayer();
  const [pitch, setPitch] = useState(0); // -12 to 12 semitones
  const [tempo, setTempo] = useState(1.0); // 0.5 to 1.5x
  const [isAudioReady, setIsAudioReady] = useState(false);

  // Reset pitch and tempo when a new song starts playing
  useEffect(() => {
    setPitch(0);
    setTempo(1.0);
    if (window.setGlobalPitch) window.setGlobalPitch(0);
    if (window.setGlobalTempo) window.setGlobalTempo(1.0);
  }, [currentVideo]);

  // We will expose setters via window or context, but for now we just handle UI state.
  // The actual connection to Tone.js and iframe sync happens in GlobalPlayer.

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPitch(val);
    if (window.setGlobalPitch) window.setGlobalPitch(val);
  };

  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTempo(val);
    if (window.setGlobalTempo) window.setGlobalTempo(val);
  };

  if (!currentVideo) return null;

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Music size={14} /> Độ Cao (Pitch)</span>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{pitch > 0 ? `+${pitch}` : pitch}</span>
        </div>
        <input 
          type="range" 
          min="-12" max="12" step="1" 
          value={pitch} 
          onChange={handlePitchChange} 
          style={{ width: '100%', accentColor: 'var(--primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '4px' }}>
          <span>-12</span>
          <span>0</span>
          <span>+12</span>
        </div>
      </div>

      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Tốc Độ (Tempo)</span>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{tempo.toFixed(2)}x</span>
        </div>
        <input 
          type="range" 
          min="0.5" max="1.5" step="0.05" 
          value={tempo} 
          onChange={handleTempoChange} 
          style={{ width: '100%', accentColor: 'var(--primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: '4px' }}>
          <span>0.5x</span>
          <span>1.0x</span>
          <span>1.5x</span>
        </div>
      </div>
    </>
  );
};

export default PitchTempoControls;

// Add type declarations for our global setters
declare global {
  interface Window {
    setGlobalPitch?: (pitch: number) => void;
    setGlobalTempo?: (tempo: number) => void;
  }
}
