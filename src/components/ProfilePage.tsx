import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePBNResult } from '../context/PBNContext';
import { 
  getUserPaintings, 
  PaintingRecord, 
  postPaintingToCommunity,
  renamePainting
} from '../services/communityService';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setResult, setActivePaintingId } = usePBNResult();

  const [paintings, setPaintings] = useState<PaintingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadPaintings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const loadPaintings = async () => {
    if (!user) return;
    try {
      const data = await getUserPaintings(user.id);
      setPaintings(data);
    } catch (err) {
      console.error('Failed to load paintings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (painting: PaintingRecord) => {
    // Reconstruct PBNResult
    setResult({
      originalDataUrl: painting.original_image_url,
      templateDataUrl: painting.template_image_url,
      paletteDataUrl: painting.palette_image_url,
      referenceDataUrl: painting.reference_image_url,
      paintedDataUrl: painting.painted_canvas_url,
      palette: painting.palette_json,
      metrics: painting.metrics_json,
    });
    setActivePaintingId(painting.id!);
    navigate('/paint');
  };

  const handlePostToCommunity = async (painting: PaintingRecord) => {
    if (painting.submitted) {
      alert("Already posted!");
      return;
    }
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Anonymous';
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    
    try {
      await postPaintingToCommunity(painting.id!, user!.id, displayName, currentMonth);
      alert('Successfully posted to the Community Gallery!');
      loadPaintings();
    } catch (err: any) {
      console.error(err);
      alert('Failed to post: ' + err.message);
    }
  };

  const handleSaveName = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await renamePainting(id, editName.trim());
      setPaintings(prev => prev.map(p => p.id === id ? { ...p, name: editName.trim() } : p));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename', err);
      alert('Failed to rename painting');
    }
  };

  if (!user) return null;

  return (
    <div className="profile-page">


      <div className="profile-container">
        <div className="profile-header">
          <h1>Your Profile</h1>
          <p>Manage your gallery and account settings.</p>
        </div>

        <div>
            {loading ? (
              <p>Loading your masterpiece collection...</p>
            ) : (
              <div className="gallery-grid">
                {/* Create New Card */}
                <div 
                  className="gallery-card" 
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                  onClick={() => navigate('/create')}
                >
                  <div className="gallery-card-img-container" style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #eaeaea' }}>
                    <div style={{ zIndex: 10, textAlign: 'center', color: '#333' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: '#666' }}>
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>Create New</h3>
                    </div>
                  </div>
                  <div className="gallery-card-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 500, color: '#666', textAlign: 'center' }}>Start a new masterpiece</p>
                  </div>
                </div>

                {paintings.map(p => (
                  <div key={p.id} className="gallery-card">
                    <div className="gallery-card-img-container" style={{ position: 'relative', width: '100%', aspectRatio: '1/1', backgroundColor: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                      <img 
                        src={p.template_image_url} 
                        alt={p.name + " Template"} 
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {p.painted_canvas_url && (
                        <img 
                          src={p.painted_canvas_url} 
                          alt={p.name + " Progress"} 
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <div className="gallery-card-content">
                      {editingId === p.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)} 
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveName(p.id!);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1.2rem', fontWeight: 600, color: '#333' }}
                          />
                          <button onClick={() => handleSaveName(p.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5' }} title="Save">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        </div>
                      ) : (
                        <h3 className="gallery-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {p.name}
                          <button 
                            onClick={() => { setEditingId(p.id!); setEditName(p.name); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '2px', display: 'flex' }}
                            title="Edit name"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                          </button>
                        </h3>
                      )}
                      <p className="gallery-card-date">
                        Last saved: {new Date(p.last_saved!).toLocaleDateString()}
                      </p>
                      <div className="gallery-card-actions">
                        <button 
                          className="gallery-btn gallery-btn-primary"
                          onClick={() => handleResume(p)}
                        >
                          Resume
                        </button>
                        <button 
                          className="gallery-btn gallery-btn-secondary"
                          onClick={() => handlePostToCommunity(p)}
                          disabled={p.submitted}
                        >
                          {p.submitted ? 'Posted' : 'Post Online'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default ProfilePage;
