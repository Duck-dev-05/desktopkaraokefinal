import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export type ChatMessage = {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
};

export type PartySong = any;

export type SyncMessage = {
  type: 'PLAY' | 'PAUSE' | 'SEEK' | 'CHANGE_SONG' | 'CHAT' | 'SYNC_QUEUE' | 'ADD_SONG' | 'REMOVE_SONG';
  payload?: any;
};

interface PartyContextType {
  peerId: string | null;
  roomId: string | null;
  isHost: boolean;
  peers: string[]; 
  createRoom: (username: string) => Promise<string>;
  joinRoom: (id: string, username: string) => Promise<void>;
  leaveRoom: () => void;
  broadcastSync: (msg: SyncMessage) => void;
  lastSyncMessage: SyncMessage | null;
  remoteStreams: MediaStream[];
  localStream: MediaStream | null;
  isMicOn: boolean;
  isVideoOn: boolean;
  initLocalStream: () => Promise<void>;
  toggleMic: () => void;
  toggleVideo: () => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string, username: string) => void;
  partyQueue: PartySong[];
  addSongToPartyQueue: (song: PartySong) => void;
  removeSongFromPartyQueue: (index: number) => void;
}

const PartyContext = createContext<PartyContextType | undefined>(undefined);

const createEmptyStream = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.fillRect(0, 0, 1, 1);
  const videoStream = canvas.captureStream(0);
  
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dst = audioCtx.createMediaStreamDestination();
  const audioStream = dst.stream;
  
  const stream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioStream.getAudioTracks()
  ]);
  
  stream.getTracks().forEach(t => t.enabled = false);
  return stream;
};

export const PartyProvider = ({ children }: { children: ReactNode }) => {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState<string[]>([]);
  const [lastSyncMessage, setLastSyncMessage] = useState<SyncMessage | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const hostUsernameRef = useRef<string>('Chủ phòng');
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [partyQueue, setPartyQueue] = useState<PartySong[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const isHostRef = useRef(false);
  const myIdRef = useRef<string>('');
  
  const partyQueueRef = useRef<PartySong[]>([]);
  useEffect(() => {
    partyQueueRef.current = partyQueue;
  }, [partyQueue]);

  const connectSignaling = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      const ws = new WebSocket('ws://127.0.0.1:1421');
      ws.onopen = () => {
        wsRef.current = ws;
        
        // Generate a random ID for myself
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let id = '';
        for (let i = 0; i < 10; i++) {
          id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        myIdRef.current = `${id.slice(0,3)}-${id.slice(3,7)}-${id.slice(7,10)}`;
        setPeerId(myIdRef.current);
        resolve();
      };
      
      ws.onerror = (e) => reject(e);
      ws.onclose = () => {
        wsRef.current = null;
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'offer') {
            await handleOffer(data);
          } else if (data.type === 'answer') {
            await handleAnswer(data);
          } else if (data.type === 'ice') {
            await handleIceCandidate(data);
          } else if (data.type === 'join_request') {
            // A guest wants to join the host
            if (isHostRef.current) {
               createPeerConnection(data.from, true, data.username);
            }
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      };
    });
  };

  const createPeerConnection = async (remoteId: string, isInitiator: boolean, remoteUsername: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pcsRef.current.set(remoteId, pc);
    setPeers(prev => [...prev, remoteId]);

    // Send ICE candidates to remote peer
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice',
          candidate: event.candidate,
          to: remoteId,
          from: myIdRef.current
        }));
      }
    };

    // Receive media streams
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      (remoteStream as any).peerId = remoteId;
      (remoteStream as any).username = remoteUsername || 'Khách';
      // If I am guest, the remote stream is always the host
      if (!isHostRef.current) {
        (remoteStream as any).isHost = true;
      }
      
      setRemoteStreams(prev => {
        if (!prev.find(s => s.id === remoteStream.id)) {
          return [...prev, remoteStream];
        }
        return prev;
      });
    };

    // Data channel logic
    if (isInitiator) {
      const dc = pc.createDataChannel('party-sync');
      setupDataChannel(dc, remoteId);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel, remoteId);
      };
    }

    // Add local stream tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
           pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // Create offer if initiator
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'offer',
          offer,
          to: remoteId,
          from: myIdRef.current,
          username: hostUsernameRef.current
        }));
      }
    }
    
    return pc;
  };

  const setupDataChannel = (dc: RTCDataChannel, remoteId: string) => {
    dc.onopen = () => {
      dataChannelsRef.current.set(remoteId, dc);
      
      // If I am host, I send my initial state to the newly connected guest
      if (isHostRef.current) {
         dc.send(JSON.stringify({ type: 'HOST_INFO', payload: { username: hostUsernameRef.current } }));
         dc.send(JSON.stringify({ type: 'SYNC_QUEUE', payload: partyQueueRef.current }));
      }
    };
    
    dc.onclose = () => {
      dataChannelsRef.current.delete(remoteId);
      setPeers(prev => prev.filter(p => p !== remoteId));
      setRemoteStreams(prev => prev.filter(s => (s as any).peerId !== remoteId));
      pcsRef.current.delete(remoteId);
    };

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'HOST_INFO') {
          hostUsernameRef.current = data.payload.username;
        } else {
          handleIncomingMessage(data as SyncMessage, remoteId);
        }
      } catch (e) {
        console.error("Data channel parse error", e);
      }
    };
  };

  const handleOffer = async (data: any) => {
    const remoteId = data.from;
    const pc = await createPeerConnection(remoteId, false, data.username);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        answer,
        to: remoteId,
        from: myIdRef.current
      }));
    }
  };

  const handleAnswer = async (data: any) => {
    const pc = pcsRef.current.get(data.from);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const handleIceCandidate = async (data: any) => {
    const pc = pcsRef.current.get(data.from);
    if (pc && data.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleIncomingMessage = (msg: SyncMessage, senderId?: string) => {
    switch (msg.type) {
      case 'CHAT':
        setChatMessages(prev => [...prev, msg.payload]);
        if (isHostRef.current && senderId) {
           dataChannelsRef.current.forEach((dc, id) => {
             if (id !== senderId && dc.readyState === 'open') dc.send(JSON.stringify(msg));
           });
        }
        break;
      case 'SYNC_QUEUE':
        setPartyQueue(msg.payload);
        break;
      case 'ADD_SONG':
        if (isHostRef.current) {
          setPartyQueue(prev => {
             const newQ = [...prev, msg.payload];
             broadcastSync({ type: 'SYNC_QUEUE', payload: newQ });
             return newQ;
          });
        }
        break;
      case 'REMOVE_SONG':
         if (isHostRef.current) {
           setPartyQueue(prev => {
             const newQ = prev.filter((_, i) => i !== msg.payload);
             broadcastSync({ type: 'SYNC_QUEUE', payload: newQ });
             return newQ;
           });
         }
         break;
      default:
        setLastSyncMessage(msg);
        if (isHostRef.current && senderId && ['PLAY', 'PAUSE', 'SEEK', 'CHANGE_SONG'].includes(msg.type)) {
           dataChannelsRef.current.forEach((dc, id) => {
             if (id !== senderId && dc.readyState === 'open') dc.send(JSON.stringify(msg));
           });
        }
        break;
    }
  };

  const broadcastSync = (msg: SyncMessage) => {
    dataChannelsRef.current.forEach(dc => {
      if (dc.readyState === 'open') {
        dc.send(JSON.stringify(msg));
      }
    });
  };

  const sendChatMessage = (text: string, username: string) => {
    const msgObj: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      senderName: username,
      text,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, msgObj]); 
    broadcastSync({ type: 'CHAT', payload: msgObj }); 
  };

  const addSongToPartyQueue = (song: PartySong) => {
    if (isHostRef.current) {
       setPartyQueue(prev => {
         const newQ = [...prev, song];
         broadcastSync({ type: 'SYNC_QUEUE', payload: newQ });
         return newQ;
       });
    } else {
       broadcastSync({ type: 'ADD_SONG', payload: song });
    }
  };

  const removeSongFromPartyQueue = (index: number) => {
    if (isHostRef.current) {
       setPartyQueue(prev => {
         const newQ = prev.filter((_, i) => i !== index);
         broadcastSync({ type: 'SYNC_QUEUE', payload: newQ });
         return newQ;
       });
    } else {
       broadcastSync({ type: 'REMOVE_SONG', payload: index });
    }
  };

  const initLocalStream = async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsMicOn(true);
      setIsVideoOn(true);
    } catch (e) {
      console.warn("Could not get media for party mode, falling back to empty stream", e);
      const emptyStream = createEmptyStream();
      setLocalStream(null); 
      localStreamRef.current = emptyStream;
      setIsMicOn(false);
      setIsVideoOn(false);
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsMicOn(audioTracks[0].enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsVideoOn(videoTracks[0].enabled);
      }
    }
  };

  const createRoom = async (username: string) => {
    await connectSignaling();
    if (!myIdRef.current) throw new Error("Signaling connection failed");
    
    setIsHost(true);
    isHostRef.current = true;
    setRoomId(myIdRef.current);
    hostUsernameRef.current = username;
    setChatMessages([]);
    setPartyQueue([]);
    
    if (!localStreamRef.current) {
      await initLocalStream();
    }
    return myIdRef.current;
  };

  const joinRoom = async (hostId: string, username: string) => {
    await connectSignaling();
    if (!myIdRef.current) throw new Error("Signaling connection failed");
    
    if (!localStreamRef.current) {
      await initLocalStream();
    }
    
    setRoomId(hostId);
    setIsHost(false);
    isHostRef.current = false;
    
    // Send a join request to the host via WebSocket signaling server
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'join_request',
        to: hostId,
        from: myIdRef.current,
        username
      }));
    }
  };

  const leaveRoom = () => {
    pcsRef.current.forEach(pc => pc.close());
    dataChannelsRef.current.forEach(dc => dc.close());
    pcsRef.current.clear();
    dataChannelsRef.current.clear();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setRoomId(null);
    setIsHost(false);
    isHostRef.current = false;
    setPeers([]);
    setRemoteStreams([]);
    setChatMessages([]);
    setPartyQueue([]);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  return (
    <PartyContext.Provider value={{ 
      peerId, roomId, isHost, peers, createRoom, joinRoom, leaveRoom, 
      broadcastSync, lastSyncMessage, remoteStreams, localStream, 
      isMicOn, isVideoOn, initLocalStream, toggleMic, toggleVideo,
      chatMessages, sendChatMessage, partyQueue, addSongToPartyQueue, removeSongFromPartyQueue
    }}>
      {children}
    </PartyContext.Provider>
  );
};

export const useParty = () => {
  const ctx = useContext(PartyContext);
  if (!ctx) throw new Error("useParty must be used within PartyProvider");
  return ctx;
};
