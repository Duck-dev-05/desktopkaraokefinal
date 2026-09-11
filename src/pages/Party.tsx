import React, { useState, useEffect, useRef } from 'react';
import { useParty } from '../context/PartyContext';
import { Users, LogIn, Link as LinkIcon, Mic, MicOff, PhoneOff, Copy, Search, ExternalLink, Video, VideoOff, Keyboard, Send, Music, Mic2, Lock, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import DuetManager from '../components/DuetManager';
import './Party.css';

const Party: React.FC = () => {
  const { createRoom, joinRoom, roomId, leaveRoom, peerId, peers, isHost, localStream, remoteStreams, isMicOn, isVideoOn, initLocalStream, toggleMic, toggleVideo, chatMessages, sendChatMessage, partyQueue, publicRooms, fetchPublicRooms, kickUser } = useParty();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'LANDING' | 'PRE_CALL'>('LANDING');
  const [isCreating, setIsCreating] = useState(false);
  const [showDuetManager, setShowDuetManager] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [roomPassword, setRoomPassword] = useState('');

  useEffect(() => {
    if (step === 'LANDING' && !roomId) {
      fetchPublicRooms();
      const interval = setInterval(fetchPublicRooms, 5000);
      return () => clearInterval(interval);
    }
  }, [step, roomId, fetchPublicRooms]);

  const handleStartCreateRoom = async () => {
    if (!user || user.role === 'user' || user.role === 'free_plan') {
      alert("Chỉ thành viên Premium mới có thể tạo phòng hát chung. Vui lòng nâng cấp!");
      navigate('/premium');
      return;
    }

    setIsConnecting(true);
    setError('');
    await initLocalStream();
    setIsCreating(true);
    setStep('PRE_CALL');
    setIsConnecting(false);
  };

  const handleStartJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsConnecting(true);
    setError('');
    await initLocalStream();
    setIsCreating(false);
    setStep('PRE_CALL');
    setIsConnecting(false);
  };

  const handleJoinNow = async () => {
    try {
      setIsConnecting(true);
      setError('');
      const username = user?.username || 'Tôi';
      if (isCreating) {
        await createRoom(username, roomPassword.trim());
      } else {
        await joinRoom(joinCode.trim(), username, roomPassword.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tham gia phòng');
      setStep('LANDING');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setStep('LANDING');
  };

  const copyToClipboard = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      alert('Đã sao chép mã phòng!');
    }
  };
  
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim(), user?.username || 'Tôi');
    setChatInput('');
  };

  return (
    <div className={`page-container ${roomId ? 'party-active' : step === 'PRE_CALL' ? 'party-pre-call' : 'party-landing'}`}>
      {error && <div className="party-error-toast">{error}</div>}

      {!roomId && step === 'LANDING' && (
        <div className="party-landing-container">
          <div className="party-landing-left">
            <h1 className="landing-title">Hát karaoke trực tuyến cùng bạn bè, ở bất cứ đâu!</h1>
            <p className="landing-subtitle">
              Mang không khí phòng hát đến mọi nơi. Kết nối, tương tác và cùng nhau tạo nên những màn trình diễn tuyệt vời với chất lượng âm thanh và hình ảnh theo thời gian thực.
            </p>

            <div className="party-landing-actions">
              <button 
                className="btn btn-primary btn-create-meet" 
                onClick={handleStartCreateRoom} 
                disabled={isConnecting}
              >
                <Video size={20} /> {isConnecting ? 'Đang chuẩn bị...' : 'Tạo cuộc gọi mới'}
              </button>
              
              <form onSubmit={handleStartJoinRoom} className="join-input-group">
                <Keyboard size={20} className="input-icon" />
                <input 
                  type="text" 
                  placeholder="Nhập mã phòng" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  disabled={isConnecting}
                />
                <button 
                  type="submit" 
                  className="btn-join-text" 
                  disabled={isConnecting || !joinCode.trim()}
                >
                  Tham gia
                </button>
              </form>
            </div>

            <div className="party-landing-footer">
              <a href="#" onClick={(e) => e.preventDefault()}><span className="text-primary">Tìm hiểu thêm</span></a> về tính năng Hát Cùng Nhau
            </div>
          </div>
          
          <div className="party-landing-right">
            <div className="public-rooms-lobby" style={{background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '1.5rem', height: '100%', minHeight: '400px'}}>
              <h3 style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fff'}}><Users size={20}/> Phòng Hát Công Khai ({publicRooms.length})</h3>
              {publicRooms.length === 0 ? (
                <p style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '2rem'}}>Hiện không có phòng công khai nào.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '350px'}}>
                   {publicRooms.map(room => (
                      <div key={room.id} style={{background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                         <div>
                            <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#fff'}}>{room.host_name}'s Room</div>
                            <div style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', display: 'flex', gap: '1rem', marginTop: '0.3rem'}}>
                               <span><Users size={14}/> {room.participant_count} người</span>
                               {room.has_password && <span style={{color: '#ff9800'}}><Lock size={14}/> Có mật khẩu</span>}
                            </div>
                         </div>
                         <button className="btn btn-primary" onClick={() => { setJoinCode(room.id); setStep('PRE_CALL'); }}>Tham gia</button>
                      </div>
                   ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!roomId && step === 'PRE_CALL' && (
        <div className="pre-call-container">
          <h2>Sẵn sàng tham gia?</h2>
          <div className="pre-call-video-wrapper">
            {localStream && isVideoOn ? (
                <video ref={(node) => { if (node && !node.srcObject) node.srcObject = localStream; }} autoPlay muted playsInline className="pre-call-video" />
            ) : (
                <div className="video-placeholder">
                  <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username || 'Tôi'}`} alt="Me" className="participant-avatar-large" referrerPolicy="no-referrer" />
                </div>
            )}
            <div className="pre-call-controls">
              <button className={`btn-media-toggle ${!isMicOn ? 'muted' : ''}`} onClick={toggleMic}>
                  {isMicOn ? <Mic size={24}/> : <MicOff size={24}/>}
              </button>
              <button className={`btn-media-toggle ${!isVideoOn ? 'muted' : ''}`} onClick={toggleVideo}>
                  {isVideoOn ? <Video size={24}/> : <VideoOff size={24}/>}
              </button>
            </div>
          </div>
          
          <div className="pre-call-actions">
            <div className="password-input-group" style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center'}}>
               <Lock size={18} color="#aaa"/>
               <input 
                 type="text" 
                 placeholder={isCreating ? "Mật khẩu phòng (tuỳ chọn)" : "Mật khẩu phòng (nếu có)"} 
                 value={roomPassword}
                 onChange={(e) => setRoomPassword(e.target.value)}
                 style={{padding: '0.8rem', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', outline: 'none', width: '250px'}}
               />
            </div>
            <button className="btn btn-primary btn-join-now" onClick={handleJoinNow} disabled={isConnecting}>
                {isConnecting ? 'Đang kết nối...' : isCreating ? 'Bắt đầu cuộc gọi' : 'Tham gia ngay'}
            </button>
            <button className="btn btn-secondary btn-back" onClick={() => setStep('LANDING')} disabled={isConnecting}>
                Quay lại
            </button>
          </div>
        </div>
      )}

      {roomId && (
          <div className="party-room-layout">
            <div className="party-room-main">
              <div className="room-header-bar">
                <div className="header-left">
                  <div className="live-badge">
                    <div className="live-indicator"></div> 
                    <span>LIVE</span>
                  </div>
                </div>
                <div className="header-center">
                  <div className="room-code-pill">
                    <span className="code-text">{roomId}</span>
                    <button className="btn icon-btn copy-btn" onClick={copyToClipboard} title="Sao chép">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div className="header-right">
                  <div className="participant-count-badge">
                    <Users size={18} />
                    <span>{remoteStreams.length + 1}</span>
                  </div>
                </div>
              </div>
              
              <div className="participants-grid">
                {/* Local User */}
                <div className="participant-card video-card">
                  {localStream && isVideoOn ? (
                    <video
                      ref={(node) => { if (node && !node.srcObject) node.srcObject = localStream; }}
                      autoPlay
                      muted
                      playsInline
                      className="participant-video"
                    />
                  ) : (
                    <div className="video-placeholder">
                      <img src={user?.avatar_url || `https://ui-avatars.com/api/?name=${user?.username || 'Tôi'}`} alt="Me" className="participant-avatar-large" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="participant-overlay">
                    <div className="participant-name">{user?.username || "Tôi"} (Bạn) - {isHost ? 'Chủ phòng' : 'Khách'}</div>
                    <div className={`mic-status ${isMicOn ? 'active' : 'muted'}`}>
                      {isMicOn ? <Mic size={16}/> : <MicOff size={16}/>}
                    </div>
                  </div>
                </div>
                
                {/* Remote Users */}
                {remoteStreams.map((stream, idx) => {
                  const isRemoteHost = (stream as any).isHost;
                  const remoteName = (stream as any).username || `Khách ${idx + 1}`;
                  const displayName = isRemoteHost ? `${remoteName} - Chủ phòng` : remoteName;
                  
                  return (
                    <div key={stream.id} className="participant-card video-card">
                      <video
                        ref={(node) => { if (node && !node.srcObject) node.srcObject = stream; }}
                        autoPlay
                        playsInline
                        className="participant-video"
                      />
                      <div className="participant-overlay">
                        <div className="participant-name">{displayName}</div>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                           {isHost && (
                             <button className="btn icon-btn" onClick={() => kickUser((stream as any).peerId)} title="Mời ra khỏi phòng">
                                <UserMinus size={16}/>
                             </button>
                           )}
                           <div className="mic-status active"><Mic size={16}/></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {remoteStreams.length === 0 && (
                  <div className="waiting-toast">
                    <span>Chưa có ai tham gia. Hãy chia sẻ mã phòng để mời bạn bè!</span>
                  </div>
                )}
              </div>
              
              <div className="room-footer-actions">
                <div className="footer-left"></div>
                <div className="footer-center">
                  <button className={`btn icon-btn-large ${!isMicOn ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleMic}>
                    {isMicOn ? <Mic size={24}/> : <MicOff size={24}/>}
                  </button>
                  <button className={`btn icon-btn-large ${!isVideoOn ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleVideo}>
                    {isVideoOn ? <Video size={24}/> : <VideoOff size={24}/>}
                  </button>
                  <div className="party-divider-vertical"></div>
                  <button className="btn btn-secondary btn-browse" onClick={() => setShowDuetManager(true)}>
                    <Mic2 size={20} /> Hát Đôi
                  </button>
                  <button className="btn btn-secondary btn-browse" onClick={() => navigate('/')}>
                    <Search size={20} /> Tìm Bài
                  </button>
                  <button className="btn btn-danger btn-leave" onClick={handleLeaveRoom}>
                    <PhoneOff size={20} />
                  </button>
                </div>
                <div className="footer-right"></div>
              </div>
            </div>

            <div className="party-room-sidebar">
              <div className="party-qr-section">
                <h3>Quét để tham gia nhanh</h3>
                <div className="qr-wrapper">
                  <QRCode value={roomId} size={120} bgColor="transparent" fgColor="#fff" />
                </div>
                <p>Mã: <strong>{roomId}</strong></p>
              </div>
              
              <div className="party-queue-section">
                 <h3><Music size={16}/> Hàng Đợi Chung ({partyQueue.length})</h3>
                 {partyQueue.length === 0 ? (
                   <p className="empty-text">Chưa có bài hát nào</p>
                 ) : (
                   <div className="party-queue-list">
                     {partyQueue.map((song, idx) => (
                       <div key={idx} className="party-queue-item">
                         <img src={song.thumbnail} alt={song.title} />
                         <div className="info">
                           <div className="title">{song.title}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>

              <div className="party-chat-section">
                <div className="chat-messages">
                  {chatMessages.length === 0 && <p className="empty-text">Hãy bắt đầu cuộc trò chuyện!</p>}
                  {chatMessages.map(msg => {
                    const isMe = msg.senderName === (user?.username || 'Tôi');
                    return (
                      <div key={msg.id} className={`chat-message ${isMe ? 'me' : 'other'}`}>
                        <div className="chat-sender">{msg.senderName}</div>
                        <div className="chat-bubble">{msg.text}</div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input-wrapper" onSubmit={handleSendChat}>
                  <input 
                    type="text" 
                    placeholder="Nhập tin nhắn..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" disabled={!chatInput.trim()} className="btn-send-chat">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        
      {showDuetManager && (
        <DuetManager onClose={() => setShowDuetManager(false)} />
      )}
    </div>
  );
};

export default Party;

