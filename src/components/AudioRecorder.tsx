import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Save, Trash2, Loader } from 'lucide-react';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { documentDir, join } from '@tauri-apps/api/path';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import './AudioRecorder.css';

interface AudioRecorderProps {
  onSave: (filePath: string, duration: number) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const filePathRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const docPath = await documentDir();
      const recDir = await join(docPath, 'KaraokeDesktop', 'Recordings');
      await mkdir(recDir, { recursive: true });
      const fileName = `AudioRecord_${Date.now()}.webm`;
      const destPath = await join(recDir, fileName);
      
      filePathRef.current = destPath;
      setCurrentFilePath(destPath);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && filePathRef.current) {
          try {
            const buffer = await event.data.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            await writeFile(filePathRef.current, uint8Array, { append: true });
          } catch (e) {
            console.error("Failed to write audio chunk", e);
          }
        }
      };

      mediaRecorder.onstop = () => {
        if (filePathRef.current) {
           setAudioUrl(convertFileSrc(filePathRef.current));
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone permissions to record.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSave = async () => {
    if (currentFilePath) {
      setIsProcessing(true);
      try {
        const outName = `AudioRecord_${Date.now()}.mp3`;
        const recDir = await join(await documentDir(), 'KaraokeDesktop', 'Recordings');
        const outPath = await join(recDir, outName);
        
        const finalPath = await invoke<string>("convert_media", { 
            inputPath: currentFilePath, 
            outputPath: outPath, 
            isVideo: false 
        });
        
        await onSave(finalPath, recordingTime);
        discardRecording(); // Clean up after successful save
      } catch (err) {
        console.error("Save/Convert failed", err);
        // Fallback to webm
        await onSave(currentFilePath, recordingTime);
        discardRecording();
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const discardRecording = () => {
    setAudioUrl(null);
    setCurrentFilePath(null);
    filePathRef.current = null;
    setRecordingTime(0);
  };

  return (
    <div className="audio-recorder-container glass-panel">
      {!audioUrl ? (
        <div className="recorder-active-view">
          <div className={`recording-indicator ${isRecording ? 'pulse' : ''}`}>
            <Mic size={32} color={isRecording ? '#ef4444' : 'var(--text-muted)'} />
          </div>
          
          <div className="recording-time">
            {isRecording ? formatTime(recordingTime) : '0:00'}
          </div>

          <div className="recorder-controls">
            {!isRecording ? (
              <button className="btn btn-primary btn-round" onClick={startRecording}>
                <Mic size={20} />
                Bắt Đầu Thu Âm
              </button>
            ) : (
              <button className="btn btn-danger btn-round" onClick={stopRecording}>
                <Square size={20} />
                Dừng Thu Âm
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="recorder-preview-view">
          <h3>Nghe Thử Bản Thu</h3>
          <audio src={audioUrl} controls className="audio-preview-element" />
          
          <div className="preview-controls">
            <button className="btn btn-outline" onClick={discardRecording} disabled={isProcessing}>
              <Trash2 size={18} />
              Bỏ Qua
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isProcessing}>
              {isProcessing ? <Loader className="spin" size={18} /> : <Save size={18} />}
              Lưu Bản Thu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
