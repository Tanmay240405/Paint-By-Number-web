import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePBNResult } from '../context/PBNContext';
import { 
  getUserPaintings, 
  PaintingRecord, 
  postPaintingToCommunity 
} from '../services/communityService';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setResult, setActivePaintingId } = usePBNResult();

  const [paintings, setPaintings] = useState<PaintingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadPaintings();
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
                      <h3 className="gallery-card-title">{p.name}</h3>
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
