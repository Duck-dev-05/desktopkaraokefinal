import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Download, Check, AlertTriangle } from 'lucide-react';
import './BinaryChecker.css';

interface BinaryCheckerProps {
  onClose: () => void;
}

interface BinaryStatus {
  ffmpeg: boolean;
  yt_dlp: boolean;
  instructions: string;
}

const BinaryChecker = ({ onClose }: BinaryCheckerProps) => {
  const [status, setStatus] = useState<BinaryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBinaries();
  }, []);

  const checkBinaries = async () => {
    try {
      const result = await invoke<[boolean, boolean, string]>('check_binaries');
      setStatus({
        ffmpeg: result[0],
        yt_dlp: result[1],
        instructions: result[2]
      });
    } catch (error) {
      console.error('Failed to check binaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const allAvailable = status?.ffmpeg && status?.yt_dlp;

  if (isLoading) {
    return (
      <div className="binary-checker-overlay">
        <div className="binary-checker-modal">
          <div className="binary-checker-loading">
            <div className="spinner"></div>
            <p>Checking system dependencies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (allAvailable) {
    return null; // Don't show if everything is available
  }

  return (
    <div className="binary-checker-overlay">
      <div className="binary-checker-modal">
        <button className="binary-checker-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="binary-checker-header">
          <AlertTriangle size={32} className="warning-icon" />
          <div>
            <h2>Missing Dependencies</h2>
            <p>Some features require additional software</p>
          </div>
        </div>

        <div className="binary-checker-status">
          <div className={`binary-item ${status?.ffmpeg ? 'available' : 'missing'}`}>
            <div className="binary-icon">
              {status?.ffmpeg ? <Check size={20} /> : <X size={20} />}
            </div>
            <div className="binary-info">
              <span className="binary-name">ffmpeg</span>
              <span className="binary-status">
                {status?.ffmpeg ? 'Available' : 'Not found'}
              </span>
            </div>
          </div>

          <div className={`binary-item ${status?.yt_dlp ? 'available' : 'missing'}`}>
            <div className="binary-icon">
              {status?.yt_dlp ? <Check size={20} /> : <X size={20} />}
            </div>
            <div className="binary-info">
              <span className="binary-name">yt-dlp</span>
              <span className="binary-status">
                {status?.yt_dlp ? 'Available' : 'Not found'}
              </span>
            </div>
          </div>
        </div>

        <div className="binary-checker-instructions">
          <h3>Installation Instructions</h3>
          <pre className="instructions-text">{status?.instructions}</pre>
        </div>

        <div className="binary-checker-footer">
          <button className="btn btn-primary" onClick={checkBinaries}>
            <Download size={16} />
            Recheck
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default BinaryChecker;