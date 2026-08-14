import { useState, useEffect, useRef } from "react";
import { X, Mic, Settings, Search as SearchIcon, Play, Plus, SkipBack, SkipForward, List, Trash2, Users, Video, Camera, CameraOff, Circle, Sliders, Volume2, Download, Loader2 } from "lucide-react";
import { useParty } from "../context/PartyContext";
import YouTube, { YouTubeProps } from "react-youtube";
import * as Tone from "tone";
import PitchTempoControls from "./PitchTempoControls";
import { searchYoutubeKaraoke, YoutubeVideo } from "../api/youtube";
import { useQueue } from "../context/QueueContext";
import { useHistory } from "../context/HistoryContext";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { saveRecording, addAudioRecording, addDownload } from "../db";
import { invoke } from '@tauri-apps/api/core';
import { documentDir, join } from '@tauri-apps/api/path';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { useDeviceDetection } from "../hooks/useDeviceDetection";
import { useSettings } from "../context/SettingsContext";
import LyricsDisplay from "./LyricsDisplay";
import "../pages/SingView.css";
import "../pages/SingView_Search.css";
import "../pages/SingView_Search_actions.css";

const GlobalPlayer = () => {
  const { currentVideo, playVideo, closePlayer, audioOffset } = usePlayer();
  const audioOffsetRef = useRef(audioOffset);
  
  useEffect(() => {
    audioOffsetRef.current = audioOffset;
  }, [audioOffset]);
  const { queue: localQueue, addToQueue: localAddToQueue, removeFromQueue: localRemoveFromQueue, notify } = useQueue();
  const { addToHistory, history } = useHistory();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YoutubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isTypingRef = useRef(false);

  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isMicSelectOpen, setIsMicSelectOpen] = useState(false);
  const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([]);
  const autoMicRef = useRef(false);

  // Scoring & Mic State
  const { user } = useAuth();
  const { hasAmplifier } = useDeviceDetection();
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const isMicEnabledRef = useRef(false);
  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  // Auto turn off microphone when player closes (no active video)
  useEffect(() => {
    if (!currentVideo && isMicEnabled) {
      if (userMediaRef.current) {
        userMediaRef.current.close();
      }
      setIsMicEnabled(false);
    }
  }, [currentVideo, isMicEnabled]);

  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState(0);
  const [_pitchLevel, setPitchLevel] = useState(0);
  const [showLLMJudge, setShowLLMJudge] = useState(false);
  const [llmFeedback, setLlmFeedback] = useState("");
  const [isMixerOpen, setIsMixerOpen] = useState(false);
  
  // Live Mixer States
  const { settings, updateSettings } = useSettings();
  const [mixerTab, setMixerTab] = useState<'volumes' | 'effects'>('volumes');
  const vocalVol = settings.micGain;
  const setVocalVol = (val: number) => updateSettings({ micGain: val });
  const beatVol = settings.masterVolume;
  const setBeatVol = (val: number) => updateSettings({ masterVolume: val });
  const echo = settings.micEcho;
  const setEcho = (val: number) => updateSettings({ micEcho: val });

  // Lyrics State
  const [currentTime, setCurrentTime] = useState(0);
  const [lrcText, setLrcText] = useState<string>("");

  const { isHost, roomId, broadcastSync, lastSyncMessage, remoteStreams, localStream, partyQueue, addSongToPartyQueue, removeSongFromPartyQueue } = useParty();

  // Dynamic queue resolving: use partyQueue if in a room, else local queue
  const activeQueue = roomId ? partyQueue : localQueue;
  const activeAddToQueue = roomId ? addSongToPartyQueue : localAddToQueue;
  const activeRemoveFromQueue = roomId ? removeSongFromPartyQueue : localRemoveFromQueue;

  // Media Recording State
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingDurationRef = useRef(0);
  const currentRecordingPathRef = useRef<string | null>(null);

  const meterRef = useRef<Tone.Meter | null>(null);
  const userMediaRef = useRef<Tone.UserMedia | null>(null);
  const ytPlayerRef = useRef<any>(null);
  
  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // DSP Refs
  const vocalVolNodeRef = useRef<Tone.Volume | null>(null);
  const echoNodeRef = useRef<Tone.FeedbackDelay | null>(null);
  const reverbNodeRef = useRef<Tone.Reverb | null>(null);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStream) recordingStream.getTracks().forEach(track => track.stop());
    };
  }, [recordingStream]);

  // Sync Audio with Video Loop
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const audio = document.getElementById('karaoke-audio') as HTMLAudioElement;
      const player = ytPlayerRef.current;

      if (audio && player) {
        try {
          const state = player.getPlayerState();
          // state 1 means PLAYING
          if (state === 1) {
            const ytTime = player.getCurrentTime();
            const targetTime = Math.max(0, ytTime + (audioOffsetRef.current / 1000));
            // If the audio is out of sync by more than 0.25 seconds, snap it to the video time
            if (Math.abs(audio.currentTime - targetTime) > 0.25) {
              audio.currentTime = targetTime;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    let animationFrameId: number;
    const trackTime = () => {
      if (ytPlayerRef.current) {
        try {
          const state = ytPlayerRef.current.getPlayerState();
          if (state === 1) {
             setCurrentTime(ytPlayerRef.current.getCurrentTime());
          }
        } catch(e) {}
      }
      animationFrameId = requestAnimationFrame(trackTime);
    };
    animationFrameId = requestAnimationFrame(trackTime);

    return () => {
      clearInterval(syncInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Update DSP when sliders change
  useEffect(() => {
    if (vocalVolNodeRef.current) {
      vocalVolNodeRef.current.volume.value = vocalVol === 0 ? -100 : 20 * Math.log10(vocalVol / 100);
    }
  }, [vocalVol]);

  useEffect(() => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(Math.min(100, beatVol));
    }
    const audio = document.getElementById('karaoke-audio') as HTMLMediaElement;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, beatVol / 100));
    }
  }, [beatVol]);

  useEffect(() => {
    const audio = document.getElementById('karaoke-audio') as HTMLMediaElement;
    if (audio && (audio as any).setSinkId) {
      (audio as any).setSinkId(settings.outputDevice === 'default' ? '' : settings.outputDevice).catch(console.error);
    }
  }, [settings.outputDevice]);

  useEffect(() => {
    if (ytPlayerRef.current && ytPlayerRef.current.setPlaybackQuality) {
      const q = settings.videoQuality === '1080p' ? 'hd1080' : settings.videoQuality === '720p' ? 'hd720' : 'large';
      ytPlayerRef.current.setPlaybackQuality(q);
    }
  }, [settings.videoQuality]);

  useEffect(() => {
    if (echoNodeRef.current) {
      echoNodeRef.current.wet.value = echo / 100;
    }
    if (reverbNodeRef.current) {
      reverbNodeRef.current.wet.value = echo / 100;
    }
  }, [echo]);

  useEffect(() => {
    if (currentVideo) {
      addToHistory(currentVideo);
      if (isHost) {
        broadcastSync({ type: 'CHANGE_SONG', payload: currentVideo });
      }
    }
  }, [currentVideo]);

  // Reconnect microphone globally when settings change, but only if it's currently enabled.
  // We briefly request permission so devices can be detected.
  useEffect(() => {
    const reconnectMic = async () => {
      if (hasAmplifier) return;
      
      // Request permission briefly so Settings can detect labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn("Microphone permission check failed", err);
      }

      if (!isMicEnabledRef.current) return;
      
      try {
        await Tone.start();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(device => device.kind === 'audioinput');
        
        if (mics.length > 0) {
          const constraints = { 
            audio: {
              noiseSuppression: settings.noiseSuppression,
              echoCancellation: settings.noiseSuppression,
            } 
          };
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          const deviceId = settings.micDevice === 'default' ? (stream.getAudioTracks()[0].getSettings().deviceId || 'default') : settings.micDevice;
          stream.getTracks().forEach(t => t.stop());
          
          if (userMediaRef.current) {
            userMediaRef.current.close();
          }
          await connectMic(deviceId);
        }
      } catch (err) {
        console.warn("Reconnect mic failed or ignored", err);
      }
    };

    reconnectMic();
  }, [settings.micDevice, settings.noiseSuppression, hasAmplifier]);

  // Setup Tone.js Pitch Shift
  useEffect(() => {
    window.setGlobalPitch = (pitch) => {
      if ((window as any).pitchShiftNode) {
        (window as any).pitchShiftNode.pitch = pitch;
      }
    };

    window.setGlobalTempo = (tempo) => {
      if ((window as any).karaokeAudio) {
        (window as any).karaokeAudio.playbackRate = tempo;
      }
    };

    // Cleanup mic on unmount
    return () => {
      if (userMediaRef.current) {
        userMediaRef.current.close();
      }
    };
  }, []);

  const handleAudioMount = (audioNode: HTMLMediaElement | null) => {
    if (!audioNode || (audioNode as any).__toneConnected) return;

    try {
      const source = Tone.getContext().createMediaElementSource(audioNode);
      const pitchShift = new Tone.PitchShift(0).toDestination();
      Tone.connect(source, pitchShift);
      (audioNode as any).__toneConnected = true;
      (window as any).pitchShiftNode = pitchShift;
      (window as any).karaokeAudio = audioNode;
    } catch (err) {
      console.error("Tone.js setup error", err);
    }
  };

  useEffect(() => {
    const unlockTone = () => {
      Tone.start();
    };
    document.addEventListener('click', unlockTone);
    return () => document.removeEventListener('click', unlockTone);
  }, []);

  useEffect(() => {
    if (!isHost && lastSyncMessage && currentVideo) {
      if (lastSyncMessage.type === 'PLAY') {
        ytPlayerRef.current?.seekTo(lastSyncMessage.payload, true);
        ytPlayerRef.current?.playVideo();
      } else if (lastSyncMessage.type === 'PAUSE') {
        ytPlayerRef.current?.pauseVideo();
      } else if (lastSyncMessage.type === 'CHANGE_SONG') {
        playVideo(lastSyncMessage.payload);
      }
    }
  }, [lastSyncMessage, isHost]);

  useEffect(() => {
    let animationFrameId: number;

    const updateMeter = () => {
      if (isMicEnabled && meterRef.current) {
        const db = meterRef.current.getValue();
        let level = 0;

        if (typeof db === 'number') {
          level = Math.max(0, Math.min(100, (db + 60) * (100 / 60)));
        } else if (db.length > 0) {
          level = Math.max(0, Math.min(100, (db[0] + 60) * (100 / 60)));
        }

        setPitchLevel(level);

        if (level > 20) {
          // Accumulate a small fraction per frame. 
          // (level/100) is 0 to 1. At 60fps, adding ~0.01 per frame means it takes ~160 seconds to hit 100.
          setScore(prev => Math.min(100, prev + (level / 100) * 0.01));
        }
      }
      animationFrameId = requestAnimationFrame(updateMeter);
    };

    if (isMicEnabled) {
      updateMeter();
    } else {
      setPitchLevel(0);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMicEnabled]); // Only depend on isMicEnabled so we don't restart loop often

  const toggleMic = async () => {
    setIsMicSelectOpen(false);

    if (isMicEnabled) {
      if (userMediaRef.current) {
        userMediaRef.current.close();
      }
      setIsMicEnabled(false);
      notify("Đã tắt micro.");
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter(device => device.kind === 'audioinput');
      
      if (mics.length > 1) {
        setAvailableMics(mics);
        setIsMicSelectOpen(true);
        return;
      }

      await Tone.start();
      
      const constraints = { 
        audio: {
          noiseSuppression: settings.noiseSuppression,
          echoCancellation: settings.noiseSuppression,
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const deviceId = settings.micDevice === 'default' ? (stream.getAudioTracks()[0].getSettings().deviceId || 'default') : settings.micDevice;
      stream.getTracks().forEach(t => t.stop());
      
      await connectMic(deviceId);
    } catch (permissionErr) {
      console.warn("Microphone permission denied or ignored.", permissionErr);
      notify("Vui lòng cấp quyền sử dụng micro trong trình duyệt của bạn.");
    }
  };

  const connectMic = async (deviceId: string) => {
    try {
      await Tone.start();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          noiseSuppression: settings.noiseSuppression,
          echoCancellation: settings.noiseSuppression
        }
      });
      
      const mediaStreamSource = new Tone.UserMedia();
      const meter = new Tone.Meter();
      Tone.connect(mediaStreamSource, meter);

      // Create DSP Engine
      const vocalVolNode = new Tone.Volume(vocalVol === 0 ? -100 : 20 * Math.log10(vocalVol / 100));
      const echoNode = new Tone.FeedbackDelay(0.3, 0.3); // 300ms delay, 30% feedback
      const reverbNode = new Tone.Freeverb(); 
      reverbNode.roomSize.value = 0.8;
      reverbNode.dampening = 2000;
      
      // Initial states
      echoNode.wet.value = echo / 100;
      reverbNode.wet.value = echo / 100;

      // Connect Mic to Effects Chain, then to Speakers
      Tone.connect(mediaStreamSource, echoNode);
      echoNode.connect(reverbNode);
      reverbNode.connect(vocalVolNode);
      vocalVolNode.toDestination();
      
      vocalVolNodeRef.current = vocalVolNode;
      echoNodeRef.current = echoNode;
      reverbNodeRef.current = reverbNode;

      await mediaStreamSource.open();
      
      (mediaStreamSource as any)._stream = stream;
      userMediaRef.current = mediaStreamSource as any;
      meterRef.current = meter;

      setIsMicEnabled(true);
      notify("Đã kết nối micro với hiệu ứng Mixer DSP!");
    } catch (err) {
      console.error("Could not access microphone", err);
      notify("Từ chối truy cập micro hoặc micro không khả dụng.");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopMediaRecording();
    } else {
      await startMediaRecording();
    }
  };

  const startMediaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: isCameraEnabled, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setRecordingStream(stream);

      // Create target directory and file path
      const docPath = await documentDir();
      const recDir = await join(docPath, 'KaraokeDesktop', 'Recordings');
      await mkdir(recDir, { recursive: true });

      const fileName = `${isCameraEnabled ? 'VideoRecord' : 'AudioRecord'}_${Date.now()}.webm`;
      const destPath = await join(recDir, fileName);
      currentRecordingPathRef.current = destPath;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: isCameraEnabled ? 'video/webm' : 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      recordingDurationRef.current = 0;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && currentRecordingPathRef.current) {
          try {
            const buffer = await event.data.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            await writeFile(currentRecordingPathRef.current, uint8Array, { append: true });
          } catch (e) {
            console.error("Failed to write chunk to disk:", e);
          }
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const duration = recordingDurationRef.current;
          const m = Math.floor(duration / 60);
          const s = duration % 60;
          const durationStr = `${m}:${s.toString().padStart(2, '0')}`;

          const displayTitle = currentVideo ? currentVideo.title : fileName;
          const videoId = currentVideo ? currentVideo.id : '';
          
          if (currentRecordingPathRef.current) {
             const inputPath = currentRecordingPathRef.current;
             notify("Đang xử lý và chuyển đổi bản thu, vui lòng đợi...");
             
             const ext = isCameraEnabled ? '.mp4' : '.mp3';
             const outName = `${isCameraEnabled ? 'VideoRecord' : 'AudioRecord'}_${Date.now()}${ext}`;
             const outPath = await join(recDir, outName);
             
             try {
                const finalPath = await invoke<string>("convert_media", { 
                    inputPath: inputPath, 
                    outputPath: outPath, 
                    isVideo: isCameraEnabled 
                });
                
                await addAudioRecording(displayTitle, finalPath, durationStr, videoId);
                notify(`Đã lưu ${isCameraEnabled ? 'video' : 'âm thanh'} bản thu thành công!`);
             } catch (convertErr) {
                console.error("FFmpeg conversion failed:", convertErr);
                await addAudioRecording(displayTitle, inputPath, durationStr, videoId);
                notify(`Chuyển đổi thất bại, đã lưu file gốc (.webm). Lỗi: ${convertErr}`);
             }
          }
        } catch (err) {
          console.error("Save recording error", err);
          notify("Lỗi khi lưu bản thu: " + (err as Error).message);
        } finally {
          currentRecordingPathRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Fire ondataavailable every 1000ms (1 second)
      setIsRecording(true);
      notify(isCameraEnabled ? "Đã bật camera và bắt đầu ghi hình!" : "Đã bắt đầu ghi âm!");

      recordingTimerRef.current = window.setInterval(() => {
        recordingDurationRef.current += 1;
      }, 1000);

    } catch (err) {
      console.error("Error accessing camera/mic:", err);
      notify("Vui lòng cấp quyền sử dụng thiết bị để thu âm/quay video.");
    }
  };

  const stopMediaRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      // We don't stop the tracks immediately if we want the onstop event to have access, but stopping here usually is fine.
      // Wait, we can stop tracks safely.
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      setRecordingStream(null);
      setIsRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    isTypingRef.current = false;
    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const results = await searchYoutubeKaraoke(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 1) {
        try {
          const res = await fetch(`http://127.0.0.1:15432/suggest?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          if (Array.isArray(data) && data.length > 1) {
            setSuggestions(data[1].slice(0, 6));
            if (isTypingRef.current) {
              setShowSuggestions(true);
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    const delay = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleSuggestionClick = (suggestion: string) => {
    isTypingRef.current = false;
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Use timeout to allow state to update before searching
    setTimeout(() => {
      const form = document.getElementById('global-search-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  const playNewSong = (video: YoutubeVideo) => {
    playVideo(video);
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDownload = async () => {
    if (!currentVideo || isDownloading) return;
    
    // Don't download if it's already a local file
    if (currentVideo.isLocal) {
      notify("Đây đã là tệp ngoại tuyến!");
      return;
    }
    
    setIsDownloading(true);
    notify(`Bắt đầu tải xuống: ${currentVideo.title}...`);
    
    try {
      const filePath = await invoke<string>("download_video", { videoId: currentVideo.id });
      await addDownload(currentVideo.id, currentVideo.title, filePath, currentVideo.thumbnail, currentVideo.channelTitle);
      notify(`Tải xuống thành công: ${currentVideo.title}`);
    } catch (err: any) {
      console.error("Download failed:", err);
      notify(`Lỗi tải xuống: ${err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const playNext = () => {
    setScore(0);
    setShowLLMJudge(false);
    if (activeQueue.length > 0) {
      const nextSong = activeQueue[0];
      
      if (roomId) removeSongFromPartyQueue(0);
      else localRemoveFromQueue(nextSong.queueId as string);
      
      playVideo(nextSong);
    } else {
      notify("Không còn bài hát nào trong hàng đợi!");
    }
  };

  const playPrevious = () => {
    // history[0] is the current video, history[1] is the previous one
    if (history.length > 1) {
      playVideo(history[1]);
    }
  };

  const handleQueue = (e: React.MouseEvent, video: YoutubeVideo) => {
    e.stopPropagation();
    activeAddToQueue(video);
  };

  const fetchLMStudioFeedback = async (finalScore: number) => {
    try {
      const responseText = await invoke<string>('ai_chat', {
        prompt: `My karaoke score is ${finalScore} / 100. What do you think?`,
        systemPrompt: "You are an entertaining, Simon Cowell style karaoke judge. Someone just finished singing. Provide exactly 1 short, humorous, and witty review in English based on their score (out of 100). Use emojis."
      });
      return "Judge: " + responseText.trim();
    } catch (err) {
      console.error("AI Judge Error:", err);
      // Return dynamic fallback if AI is unavailable
      if (finalScore >= 90) return "Giám khảo: Tuyệt vời! Bạn hát hay như ca sĩ thực thụ! 🌟";
      if (finalScore >= 70) return "Giám khảo: Hát rất hay, cố gắng phát huy nhé! 🎤";
      if (finalScore >= 50) return "Giám khảo: Khá ổn, bạn có tiềm năng đấy! 👍";
      return "Giám khảo: Hãy tiếp tục luyện tập thêm nhé! 🎶";
    }
  };

  const handleVideoEnd: YouTubeProps['onEnd'] = async () => {
    if (score === 0) {
      if (activeQueue.length > 0) {
        const nextSong = activeQueue[0];
        if (roomId) removeSongFromPartyQueue(0);
        else localRemoveFromQueue(nextSong.queueId as string);
        playVideo(nextSong);
      } else {
        closePlayer();
      }
      return;
    }

    setShowLLMJudge(true);
    setLlmFeedback("Giám khảo đang viết nhận xét... 🤖✍️");

    const feedback = await fetchLMStudioFeedback(score);
    setLlmFeedback(feedback);

    if (isRecording && user && currentVideo) {
      try {
        await saveRecording(user.id, currentVideo.id, currentVideo.title, currentVideo.channelTitle, currentVideo.thumbnail, Math.floor(score));
        notify("Thành tích đã được lưu vào Lịch sử và Hát Đôi!");
      } catch (err) {
        console.error("Failed to save scoring recording:", err);
      }
      stopMediaRecording(); // Ensure video recording stops
    }

    setTimeout(() => {
      setShowLLMJudge(false);
      setScore(0);
      if (activeQueue.length > 0) {
        const nextSong = activeQueue[0];
        if (roomId) removeSongFromPartyQueue(0);
        else localRemoveFromQueue(nextSong.queueId as string);
        playVideo(nextSong);
      } else {
        closePlayer();
      }
    }, 8000); // Wait 8 seconds to give time to read
  };

  const handleVideoPlay: YouTubeProps['onPlay'] = (e) => {
    Tone.start();
    if (isHost) broadcastSync({ type: 'PLAY', payload: e.target.getCurrentTime() });
    const audio = document.getElementById('karaoke-audio') as HTMLMediaElement;
    if (audio) {
      // Sync the exact current time from YouTube to the local audio element, including the calibration offset!
      const ytTime = e.target.getCurrentTime();
      const targetTime = Math.max(0, ytTime + (audioOffset / 1000));
      if (Math.abs(audio.currentTime - targetTime) > 0.5) {
        audio.currentTime = targetTime;
      }
      audio.play().catch(console.error);
    }
  };

  const handleVideoPause: YouTubeProps['onPause'] = () => {
    if (isHost) broadcastSync({ type: 'PAUSE' });
    const audio = document.getElementById('karaoke-audio') as HTMLMediaElement;
    if (audio) audio.pause();
  };

  const handleVideoStateChange: YouTubeProps['onStateChange'] = (e) => {
    const audio = document.getElementById('karaoke-audio') as HTMLMediaElement;
    if (!audio) return;

    // e.data === 3 means BUFFERING. Pause audio so it doesn't get ahead of the video.
    if (e.data === 3) {
      audio.pause();
    }
  };

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      fs: 0,
      mute: 1,
      vq: settings.videoQuality === '1080p' ? 'hd1080' : settings.videoQuality === '720p' ? 'hd720' : 'large'
    },
  };

  if (!currentVideo) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#09090b',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Inter, sans-serif',
        zIndex: 999
      }}>
        <div style={{
          background: 'linear-gradient(45deg, #a855f7, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '6rem',
          fontWeight: 900,
          marginBottom: '1rem',
          filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))'
        }}>
          Karaoke<span style={{ color: 'white', WebkitTextFillColor: 'white' }}>Pro</span>
        </div>
        <p style={{ fontSize: '1.75rem', color: '#a1a1aa', fontWeight: 500 }}>
          Sẵn sàng! Vui lòng chọn bài hát từ màn hình điều khiển...
        </p>
        <div style={{
          marginTop: '4rem',
          padding: '1rem 2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
          <span style={{ color: '#d4d4d8', fontSize: '1.2rem' }}>Đã kết nối với màn hình điều khiển</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 
        The iframe must always remain in the DOM so it doesn't reload.
        We position it fullscreen if not minimized. If minimized, we hide it.
      */}
      <div
        className="global-iframe-container"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 998,
          opacity: 1,
          pointerEvents: 'auto',
          background: 'black',
        }}
      >
        {currentVideo.isLocal ? (
          <video
            id="karaoke-audio" /* use same id for compatibility */
            ref={handleAudioMount}
            src={currentVideo.localUrl}
            crossOrigin="anonymous"
            autoPlay
            controls={false}
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: settings.showBackgroundVideo ? 1 : 0 }}
            onEnded={() => handleVideoEnd({} as any)}
            onPlay={() => Tone.start()}
          />
        ) : (
          <>
            <YouTube
              videoId={currentVideo.id}
              opts={opts}
              onReady={(e) => { 
                ytPlayerRef.current = e.target; 
                e.target.setVolume(Math.min(100, beatVol));
              }}
              onEnd={handleVideoEnd}
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onStateChange={handleVideoStateChange}
              style={{ width: '100%', height: '100%', opacity: settings.showBackgroundVideo ? 1 : 0 }}
              iframeClassName="youtube-iframe-full"
            />
            <audio
              id="karaoke-audio"
              ref={handleAudioMount}
              src={`http://127.0.0.1:15432/stream?id=${currentVideo.id}`}
              crossOrigin="anonymous"
              autoPlay
              style={{ display: 'none' }}
            />
          </>
        )}
      </div>

      {/* Recording Preview (Local) */}
      {recordingStream && isCameraEnabled && (
        <div className="party-floating-videos" style={{ position: 'fixed', right: '20px', top: '100px', zIndex: 1001, pointerEvents: 'auto' }}>
          <div className="floating-video-card" style={{ width: '200px', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #ef4444', background: '#000', boxShadow: '0 4px 12px rgba(239,68,68,0.5)' }}>
            <video
              ref={(node) => { if (node && !node.srcObject) node.srcObject = recordingStream; }}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <div style={{ position: 'absolute', top: 5, right: 5, background: '#ef4444', borderRadius: '50%', width: 10, height: 10, animation: 'pulse-glow 1.5s infinite' }} />
          </div>
        </div>
      )}

      {/* Party Mode Floating Videos */}
      {(localStream || remoteStreams.length > 0) && (
        <div className="party-floating-videos" style={{ position: 'fixed', right: '20px', bottom: '120px', zIndex: 1001, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'auto' }}>

          {/* Local User */}
          {localStream && (
            <div className="floating-video-card" style={{ width: '150px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #a855f7', background: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <video
                ref={(node) => { if (node && !node.srcObject) node.srcObject = localStream; }}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
            </div>
          )}

          {/* Remote Users */}
          {remoteStreams.map(stream => (
            <div key={stream.id} className="floating-video-card" style={{ width: '150px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', background: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <video
                ref={(node) => { if (node && !node.srcObject) node.srcObject = stream; }}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen UI (Sing View Overlay) */}
      <div className="sing-view-container" style={{ position: 'fixed', zIndex: 999, pointerEvents: 'none', background: 'transparent' }}>
        
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '20vh' }}>
          {lrcText && <LyricsDisplay lrcText={lrcText} currentTime={currentTime} />}
        </div>

        <div className="sing-header" style={{ zIndex: 1000, pointerEvents: 'auto' }}>
          <button className="btn icon-btn" onClick={closePlayer} title="Đóng Trình phát">
            <X size={28} />
          </button>
          <div className="song-meta">
            <h2>{currentVideo.title}</h2>
            <p>{currentVideo.channelTitle}</p>
          </div>
          <div className="header-actions" style={{ gap: '12px' }}>
            {/* Playback Controls */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '4px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button className="btn icon-btn" onClick={playPrevious} title="Bài trước" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}><SkipBack size={22} /></button>
              <button className="btn icon-btn" onClick={playNext} title="Bài tiếp" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}><SkipForward size={22} /></button>
            </div>

            {/* Navigation & Search */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '4px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button className="btn icon-btn" onClick={() => setIsSearchOpen(true)} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}><SearchIcon size={22} /></button>
              <button className="btn icon-btn" onClick={() => setIsQueueOpen(!isQueueOpen)} title="Danh sách phát" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <List size={22} />
              </button>
            </div>

            {/* Media & Recording */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '4px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Download */}
              <button 
                className={`btn icon-btn ${isDownloading ? 'text-primary' : ''}`} 
                onClick={handleDownload} 
                disabled={isDownloading} 
                title="Tải xuống bài hát này" 
                style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
              >
                {isDownloading ? <Loader2 size={22} className="spin" color="var(--primary)" /> : <Download size={22} />}
              </button>
              
              <button className={`btn icon-btn ${isCameraEnabled ? 'text-primary' : ''}`} onClick={() => setIsCameraEnabled(!isCameraEnabled)} disabled={isRecording} title={isCameraEnabled ? "Tắt Camera" : "Bật Camera"} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                {isCameraEnabled ? <Camera size={22} /> : <CameraOff size={22} color="var(--text-muted)" />}
              </button>
              <button className={`btn icon-btn ${isRecording ? 'text-primary' : ''}`} onClick={toggleRecording} title={isRecording ? "Dừng Bản Thu" : "Bắt Đầu Bản Thu"} style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <Circle size={22} color={isRecording ? 'var(--danger)' : 'white'} fill={isRecording ? 'var(--danger)' : 'transparent'} />
              </button>
              <button className={`btn icon-btn ${isMicEnabled ? 'text-primary' : ''}`} onClick={toggleMic} title="Bật/Tắt Micro" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <Mic size={22} color={isMicEnabled ? 'var(--primary)' : 'white'} />
              </button>
            </div>

            {/* Tools */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '4px', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button className={`btn icon-btn ${isMixerOpen ? 'text-primary' : ''}`} onClick={() => {setIsMixerOpen(!isMixerOpen); setIsMicSelectOpen(false);}} title="Live Mixer" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <Sliders size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Live Mixer Overlay */}
        {isMixerOpen && (
          <div style={{
            position: 'absolute', top: '80px', right: '80px', pointerEvents: 'auto',
            background: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(24px)',
            padding: '1.2rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)', width: '300px', zIndex: 1100
          }}>
            <h3 style={{ color: 'white', marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <Sliders size={18} color="var(--primary)" /> Live Mixer
            </h3>
            
            {/* Tabs */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '4px', marginBottom: '1.25rem' }}>
              <button 
                onClick={() => setMixerTab('volumes')}
                style={{ flex: 1, padding: '8px', border: 'none', background: mixerTab === 'volumes' ? 'var(--primary)' : 'transparent', color: mixerTab === 'volumes' ? 'white' : 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: mixerTab === 'volumes' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Âm Lượng
              </button>
              <button 
                onClick={() => setMixerTab('effects')}
                style={{ flex: 1, padding: '8px', border: 'none', background: mixerTab === 'effects' ? 'var(--primary)' : 'transparent', color: mixerTab === 'effects' ? 'white' : 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: mixerTab === 'effects' ? 'bold' : 'normal', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Hiệu Ứng
              </button>
            </div>

            {mixerTab === 'volumes' && (
              <div style={{ animation: 'slideDownFade 0.2s' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mic size={14} color="var(--primary)" /> Micro (Vocals)</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{vocalVol}%</span>
                  </div>
                  <input type="range" min="0" max="150" value={vocalVol} onChange={(e) => setVocalVol(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>

                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Volume2 size={14} color="var(--primary)" /> Nhạc nền (Beat)</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{beatVol}%</span>
                  </div>
                  <input type="range" min="0" max="150" value={beatVol} onChange={(e) => {
                    const vol = Number(e.target.value);
                    setBeatVol(vol);
                    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(Math.min(100, vol)); 
                  }} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                </div>
              </div>
            )}

            {mixerTab === 'effects' && (
              <div style={{ animation: 'slideDownFade 0.2s' }}>
                <PitchTempoControls />
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sliders size={14} color="var(--accent-cyan)" /> Độ vang (Echo/Reverb)</span>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>{echo}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={echo} onChange={(e) => setEcho(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-cyan)' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {isMicSelectOpen && (
          <>
            <style>{`
                .mic-dropdown {
                  position: absolute;
                  top: 80px;
                  right: 80px;
                  pointer-events: auto;
                  background: rgba(20, 20, 35, 0.65);
                  backdrop-filter: blur(24px);
                  -webkit-backdrop-filter: blur(24px);
                  padding: 1.25rem;
                  border-radius: 16px;
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.1);
                  z-index: 1100;
                  min-width: 280px;
                  max-width: 340px;
                  animation: slideDownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                .mic-dropdown h4 {
                  color: rgba(255, 255, 255, 0.9);
                  margin-top: 0;
                  margin-bottom: 1.2rem;
                  font-size: 0.95rem;
                  font-weight: 700;
                  letter-spacing: 0.5px;
                  text-transform: uppercase;
                }
                
                .mic-option-btn {
                  text-align: left;
                  padding: 0.8rem 1.2rem;
                  background: rgba(255, 255, 255, 0.06);
                  border: 1px solid transparent;
                  border-radius: 12px;
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 0.95rem;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 100%;
                  display: block;
                  width: 100%;
                }
                
                .mic-option-btn:hover {
                  background: rgba(255, 255, 255, 0.15);
                  border-color: rgba(255, 255, 255, 0.1);
                  transform: translateY(-2px);
                  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .mic-option-btn.disable-btn {
                  background: rgba(239, 68, 68, 0.15);
                  color: #fca5a5;
                  margin-top: 0.8rem;
                }
                
                .mic-option-btn.disable-btn:hover {
                  background: rgba(239, 68, 68, 0.25);
                  border-color: rgba(239, 68, 68, 0.3);
                  color: #fff;
                  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
                }
                
                @keyframes slideDownFade {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}</style>
            <div className="mic-dropdown">
              <h4>Chọn Micro</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableMics.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: 0 }}>Không tìm thấy micro.</p>}
                {availableMics.map((mic, idx) => {
                  const label = mic.label.replace('Default - ', '') || `Microphone ${idx + 1}`;
                  return (
                    <button
                      key={mic.deviceId}
                      className="mic-option-btn"
                      onClick={() => {
                        connectMic(mic.deviceId);
                        setIsMicSelectOpen(false);
                      }}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                })}
                {isMicEnabled && (
                  <button
                    className="mic-option-btn disable-btn"
                    onClick={() => {
                      if (userMediaRef.current) {
                        userMediaRef.current.close();
                      }
                      setIsMicEnabled(false);
                      notify("Đã tắt micro.");
                      setIsMicSelectOpen(false);
                    }}
                  >
                    Tắt Micro
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* In-Player Search Overlay */}
        {isSearchOpen && (
          <div
            className="search-overlay"
            style={{ pointerEvents: 'auto', zIndex: 1001 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setIsSearchOpen(false) }}
          >
            <div className="search-overlay-header">
              <h2>Tìm Bài Hát Khác</h2>
              <button className="btn icon-btn" onClick={() => setIsSearchOpen(false)}>
                <X size={28} />
              </button>
            </div>

            <form id="global-search-form" onSubmit={handleSearch} style={{ position: 'relative' }}>
              <input
                type="text"
                className="overlay-search-input"
                placeholder="Tìm kiếm ca sĩ hoặc bài hát..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  isTypingRef.current = true;
                }}
                onFocus={() => { if (suggestions.length > 0 && isTypingRef.current) setShowSuggestions(true); }}
                autoFocus
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions.map((sugg, idx) => (
                    <div key={idx} className="autocomplete-item" onClick={() => handleSuggestionClick(sugg)}>
                      <SearchIcon size={16} style={{ marginRight: '10px', color: 'var(--text-muted)' }} />
                      {sugg}
                    </div>
                  ))}
                </div>
              )}
            </form>

            <div className="overlay-search-results">
              {isSearching && <p style={{ color: 'white' }}>Đang tìm kiếm...</p>}
              {!isSearching && searchResults.map(video => (
                <div key={video.id} className="overlay-result-item">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="overlay-result-info">
                    <h4>{video.title}</h4>
                    <p>{video.channelTitle}</p>
                  </div>
                  <div className="overlay-result-actions">
                    <button className="btn icon-btn" onClick={() => playNewSong(video)} title="Phát ngay">
                      <Play size={20} fill="white" />
                    </button>
                    <button className="btn icon-btn" onClick={(e) => handleQueue(e, video)} title="Thêm vào hàng đợi">
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* LLM Feedback Modal */}
        {showLLMJudge && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'rgba(2, 0, 5, 0.85)', backdropFilter: 'blur(40px)',
            padding: '3rem', borderRadius: '24px', border: '1px solid rgba(255, 46, 147, 0.4)',
            boxShadow: '0 0 50px rgba(255, 46, 147, 0.3)', textAlign: 'center', zIndex: 2000,
            pointerEvents: 'auto', maxWidth: '600px'
          }}>
            <h2 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}>Điểm Số</h2>
            <p style={{ fontSize: '4rem', fontWeight: 900, color: 'white', textShadow: '0 0 20px rgba(255, 255, 255, 0.5)', marginBottom: '2rem' }}>
              {Math.floor(score).toLocaleString()} / 100
            </p>
            <div style={{ fontSize: '1.4rem', color: 'var(--accent-cyan)', lineHeight: '1.6', fontWeight: 600 }}>
              {llmFeedback}
            </div>
          </div>
        )}

        {/* Queue Overlay */}
        {isQueueOpen && (
          <div
            className="search-overlay"
            style={{ pointerEvents: 'auto', zIndex: 1001, right: 0, left: 'auto', width: '400px', padding: '2rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="search-overlay-header" style={{ marginBottom: '1.5rem' }}>
              <h2>Tiếp Theo</h2>
              <button className="btn icon-btn" onClick={() => setIsQueueOpen(false)} style={{ width: '40px', height: '40px' }}>
                <X size={20} />
              </button>
            </div>

            <div className="overlay-search-results" style={{ gridTemplateColumns: '1fr', gap: '1rem', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {activeQueue.length === 0 && <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '2rem 0' }}>Hàng đợi trống.</p>}

              {activeQueue.map((video, idx) => {
                const uniqueKey = roomId ? `party-${idx}` : video.queueId;
                return (
                  <div key={uniqueKey} className="overlay-result-item" style={{ padding: '0.8rem', borderRadius: '12px' }}>
                    <div style={{ marginRight: '0.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{idx + 1}</div>
                    <img src={video.thumbnail} alt={video.title} style={{ width: '60px', height: '45px', borderRadius: '4px' }} />
                    <div className="overlay-result-info" style={{ margin: '0 0.5rem', flex: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{video.title}</h4>
                      <p style={{ fontSize: '0.8rem' }}>{video.channelTitle}</p>
                    </div>
                    <div className="overlay-result-actions" style={{ gap: '0.5rem' }}>
                      <button className="btn" onClick={() => { 
                        playVideo(video); 
                        if (roomId) removeSongFromPartyQueue(idx); else localRemoveFromQueue(video.queueId as string);
                        setIsQueueOpen(false); 
                      }} title="Phát ngay" style={{ padding: '0.5rem' }}>
                        <Play size={16} fill="white" />
                      </button>
                      <button className="btn" onClick={() => {
                        if (roomId) removeSongFromPartyQueue(idx); else localRemoveFromQueue(video.queueId as string);
                      }} title="Xóa" style={{ padding: '0.5rem', color: 'var(--danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </>
  );
};

export default GlobalPlayer;
