import { useEffect, useState } from "react";
import { Mic2, Star, Users, Award, Play } from "lucide-react";
import { getRecordingsForUser } from "../db";
import { useAuth } from "../context/AuthContext";
import "./Profile.css";

const Profile = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'recordings' | 'favorites' | 'achievements'>('recordings');
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      getRecordingsForUser(user.id).then(data => setRecordings(data as any[])).catch(console.error);
    }
  }, [user]);

  if (!user) return null; // Wait for load

  // Gamification Logic
  const totalScore = recordings.reduce((acc, rec) => acc + rec.score, 0);
  const userLevel = Math.floor(recordings.length / 5) + 1;
  const xpProgress = (recordings.length % 5) / 5 * 100;

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header">
        <div className="profile-avatar">
          <img
            src={user.avatar_url}
            alt="Profile Avatar"
            referrerPolicy="no-referrer"
            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div className="profile-level-badge">LVL {userLevel}</div>
        </div>

        <div className="profile-info">
          <span className="profile-type">Pro User</span>
          <h1 className="profile-name">{user.username}</h1>
          <p className="profile-bio">{user.bio || "Hát vang cuộc đời. Đam mê Pop & R&B. 🎤✨"}</p>

          <div className="xp-bar-container">
            <div className="xp-info">
              <span>Tiến độ XP</span>
              <span>{Math.round(xpProgress)}% đến Cấp {userLevel + 1}</span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpProgress}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-item">
          <span className="stat-value">{recordings.length}</span>
          <span className="stat-label">Bản Thu</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{totalScore.toLocaleString()}</span>
          <span className="stat-label">Tổng Điểm</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user.followers_count >= 1000 ? (user.followers_count / 1000).toFixed(1) + 'k' : user.followers_count}</span>
          <span className="stat-label">Người Theo Dõi</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{user.following_count >= 1000 ? (user.following_count / 1000).toFixed(1) + 'k' : user.following_count}</span>
          <span className="stat-label">Đang Theo Dõi</span>
        </div>
      </div>

      <div className="profile-actions">
        <button className="btn btn-primary">Sửa Hồ Sơ</button>
        <button className="btn icon-btn-outline" title="Chia Sẻ Hồ Sơ">
          <Users size={20} />
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <button
            className={`tab-btn ${activeTab === 'recordings' ? 'active' : ''}`}
            onClick={() => setActiveTab('recordings')}
          >
            Bản Thu
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Yêu Thích
          </button>
          <button
            className={`tab-btn ${activeTab === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveTab('achievements')}
          >
            Thành Tựu
          </button>
        </div>

        <div style={{ marginTop: '2rem' }}>
          {activeTab === 'recordings' && (
            <div className="recordings-list animate-fade-in">
              {recordings.length === 0 ? (
                <div className="empty-state">Chưa có bản thu nào. Hãy cầm mic lên!</div>
              ) : (
                recordings.map((rec, idx) => (
                  <div className="recording-item" key={idx}>
                    <div className="recording-icon">
                      <Mic2 size={24} />
                    </div>
                    <div className="recording-details">
                      <h3>{rec.title}</h3>
                      <p>{rec.artist} • Điểm: {rec.score.toLocaleString()}</p>
                    </div>
                    <div className="recording-date">
                      {new Date(rec.played_at).toLocaleDateString()}
                    </div>
                    <button className="btn icon-btn-outline" title="Phát">
                      <Play size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="recordings-list animate-fade-in">
              <div className="empty-state">Chưa có bài hát yêu thích nào. Hãy bắt đầu khám phá!</div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="achievements-grid animate-fade-in">
              {badges.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>Chưa đạt được thành tựu nào. Hãy tiếp tục hát!</div>
              ) : (
                badges.map((badge, idx) => (
                  <div className={`achievement-card ${badge.earned ? 'earned' : ''}`} key={idx}>
                    <div className="achievement-icon">{badge.icon}</div>
                    <div className="achievement-details">
                      <h4>{badge.title}</h4>
                      <p>{badge.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
