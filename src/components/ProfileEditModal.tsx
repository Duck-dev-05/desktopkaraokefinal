import React, { useState } from 'react';
import { X } from 'lucide-react';
import { updateUserProfile } from '../db';
import './ProfileEditModal.css';

interface ProfileEditModalProps {
  user: any;
  onClose: () => void;
  onSave: () => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ user, onClose, onSave }) => {
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile(user.id, username, bio, avatarUrl);
      onSave();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="modal-container profile-edit-modal">
        <div className="modal-header">
          <h2>Sửa Hồ Sơ</h2>
          <button className="icon-btn-outline close-btn" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label htmlFor="avatarUrl">Đường dẫn Ảnh đại diện (URL)</label>
            <input
              type="text"
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Tên hiển thị</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên hiển thị..."
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="bio">Giới thiệu (Bio)</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Vài dòng về bản thân..."
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isSaving}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditModal;
