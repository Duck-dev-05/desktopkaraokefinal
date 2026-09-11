import { useEffect, useState } from "react";
import { Play, GripVertical, Trash2, Mic2, ListMusic, Shuffle, Save, FolderOpen, X } from "lucide-react";
import { useQueue, QueuedVideo } from "../context/QueueContext";
import { usePlayer } from "../context/PlayerContext";
import { useAuth } from "../context/AuthContext";
import { saveQueueTemplate, getQueueTemplates, QueueTemplate } from "../db";
import "./Queue.css";

const Queue = () => {
  const { user } = useAuth();
  const { queue, removeFromQueue, clearQueue, shuffleQueue, loadQueue } = useQueue();
  const { playVideo } = usePlayer();
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [templates, setTemplates] = useState<QueueTemplate[]>([]);

  useEffect(() => {
    if (showLoadModal && user) {
      getQueueTemplates(user.id).then(setTemplates);
    }
  }, [showLoadModal, user]);

  const handleSaveTemplate = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để lưu hàng đợi.");
      return;
    }
    if (!templateName.trim()) return;
    await saveQueueTemplate(user.id, templateName, JSON.stringify(queue));
    setShowSaveModal(false);
    setTemplateName("");
    alert("Đã lưu hàng đợi thành công!");
  };

  const handleLoadTemplate = (template: QueueTemplate) => {
    try {
      const items: QueuedVideo[] = JSON.parse(template.template_data);
      loadQueue(items);
      setShowLoadModal(false);
    } catch (e) {
      console.error("Failed to parse template data", e);
    }
  };

  const handlePlayNow = (item: QueuedVideo) => {
    playVideo(item);
    removeFromQueue(item.queueId);
  };

  const handleStartParty = () => {
    if (queue.length > 0) {
      handlePlayNow(queue[0]);
    }
  };

  return (
    <div className="queue-page animate-fade-in">
      <div className="queue-header">
        <div className="title-group">
          <h1>Tiếp Theo</h1>
          <span className="queue-count">{queue.length} bài hát • Ước tính {queue.length * 4} phút</span>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button 
            className="btn btn-outline"
            onClick={shuffleQueue}
            disabled={queue.length < 2}
            title="Xáo trộn"
          >
            <Shuffle size={18} />
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setShowSaveModal(true)}
            disabled={queue.length === 0}
            title="Lưu hàng đợi"
          >
            <Save size={18} />
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setShowLoadModal(true)}
            title="Tải hàng đợi đã lưu"
          >
            <FolderOpen size={18} />
          </button>
          <button 
            className="btn btn-primary start-party-btn"
            onClick={handleStartParty}
            disabled={queue.length === 0}
            style={{ opacity: queue.length === 0 ? 0.5 : 1 }}
          >
            <Play size={20} fill="black" />
            Bắt Đầu
          </button>
        </div>
      </div>

      <div className="queue-list">
        {queue.length > 0 ? queue.map((item, index) => (
          <div className="queue-item" key={item.queueId} onClick={() => handlePlayNow(item)} style={{ cursor: 'pointer' }}>
            <div className="drag-handle">
              <GripVertical size={20} />
            </div>
            <div className="queue-index">{index + 1}</div>
            <img src={item.thumbnail} alt={item.title} className="queue-thumbnail" />
            <div className="queue-song-info">
              <span className="song-title">{item.title}</span>
              <span className="song-artist">YouTube</span>
            </div>
            <div className="queue-singer">
              <span className="singer-label">KÊNH</span>
              <span className="singer-name">{item.channelTitle}</span>
            </div>
            <div className="queue-duration">
              <button 
                className="btn btn-outline" 
                style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
              >
                Phát Ngay
              </button>
            </div>
            <button 
              className="btn icon-btn-outline delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                removeFromQueue(item.queueId);
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        )) : (
          <div className="queue-empty-state animate-fade-in">
            <div className="empty-icon-container">
              <ListMusic size={48} className="empty-icon" />
            </div>
            <h3>Hàng Đợi Trống</h3>
            <p>Bạn chưa chọn bài hát nào. Hãy tìm kiếm và thêm bài hát vào hàng đợi để bắt đầu hát!</p>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content glass">
            <button className="modal-close" onClick={() => setShowSaveModal(false)}>
              <X size={24} />
            </button>
            <h2>Lưu Hàng Đợi</h2>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Tên danh sách</label>
              <input 
                type="text" 
                value={templateName} 
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Nhập tên..." 
                className="form-control"
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveTemplate} style={{ marginTop: '1rem', width: '100%' }}>Lưu</button>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="modal-overlay">
          <div className="modal-content glass" style={{ maxWidth: '500px', width: '100%' }}>
            <button className="modal-close" onClick={() => setShowLoadModal(false)}>
              <X size={24} />
            </button>
            <h2>Tải Hàng Đợi</h2>
            <div className="template-list" style={{ marginTop: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
              {templates.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Chưa có hàng đợi nào được lưu.</p>
              ) : (
                templates.map(tpl => {
                  let itemsCount = 0;
                  try {
                    itemsCount = JSON.parse(tpl.template_data).length;
                  } catch (e) {}
                  
                  return (
                    <div key={tpl.id} className="template-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.2rem 0' }}>{tpl.template_name}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{itemsCount} bài hát • {new Date(tpl.created_at).toLocaleDateString()}</span>
                      </div>
                      <button className="btn btn-outline" onClick={() => handleLoadTemplate(tpl)}>Tải</button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Queue;
