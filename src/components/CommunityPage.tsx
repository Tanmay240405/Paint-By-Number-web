import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getCommunityPosts, 
  CommunityPostSubmission, 
  upvotePost 
} from '../services/communityService';
import './CommunityPage.css';

const INSPIRATION_TEMPLATES = [
  {
    id: 1,
    title: 'Misty Mountains',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop',
    color: '#8A9A9A'
  },
  {
    id: 2,
    title: 'Neon Cyberpunk',
    url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=2070&auto=format&fit=crop',
    color: '#FF2A6D'
  },
  {
    id: 3,
    title: 'Tropical Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop',
    color: '#FFA07A'
  }
];

const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<CommunityPostSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [activePostIdx, setActivePostIdx] = useState(0);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    try {
      const data = await getCommunityPosts(currentMonth);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to load community submissions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId: number) => {
    if (!user) {
      alert('Please log in to like paintings.');
      navigate('/login');
      return;
    }

    try {
      await upvotePost(postId, user.id);
      // Optimistically update the UI
      setSubmissions(prev => 
        prev.map(sub => sub.id === postId ? { ...sub, votes: sub.votes + 1 } : sub)
      );
    } catch (err: any) {
      if (err.message?.includes('unique constraint') || err.code === '23505') {
        alert("You have already liked this painting!");
      } else {
        alert("Failed to like: " + err.message);
      }
    }
  };

  const activeHero = INSPIRATION_TEMPLATES[activeHeroIdx];

  return (
    <div className="community-page">
        {/* HERO INSPIRATION SECTION */}
        <div className="hero-inspiration-card">
          <div className="hero-img-container">
            <img 
              src={activeHero.url} 
              alt={activeHero.title} 
              className="hero-main-img" 
              key={activeHero.id}
            />
            
            {/* Overlay Action Buttons */}
            <div className="hero-overlay-actions bottom-left">
              <button className="hero-action-btn" title="Expand View">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
            </div>

            <div className="hero-overlay-actions bottom-center">
              <div className="hero-pagination">
                {INSPIRATION_TEMPLATES.map((tpl, idx) => (
                  <button 
                    key={tpl.id}
                    className={`pagination-dot ${idx === activeHeroIdx ? 'active' : ''}`}
                    onClick={() => setActiveHeroIdx(idx)}
                    aria-label={`Show ${tpl.title}`}
                  />
                ))}
              </div>
            </div>

            <div className="hero-overlay-actions bottom-right">
              <button 
                className="hero-action-btn" 
                title="Change Inspiration Image"
                onClick={() => setActiveHeroIdx((activeHeroIdx + 1) % INSPIRATION_TEMPLATES.length)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <div className="hero-bottom-bar">
            <div className="hero-thumbnails-row">
              {INSPIRATION_TEMPLATES.map((tpl, idx) => (
                <div 
                  key={tpl.id} 
                  className={`hero-thumbnail ${idx === activeHeroIdx ? 'active' : ''}`}
                  onClick={() => setActiveHeroIdx(idx)}
                >
                  <img src={tpl.url} alt={tpl.title} />
                </div>
              ))}
            </div>

            <div className="hero-bottom-actions">
              <div className="hero-bottom-text">
                <span className="get-inspired-text">Get Inspired</span>
              </div>
              <button 
                className="hero-create-btn" 
                title="Paint this template" 
                onClick={() => navigate('/create', { state: { imageUrl: activeHero.url } })}
              >
                Create
              </button>
            </div>
          </div>
        </div>

      <div className="community-posts-section">
        <div className="community-container">
          <h2 style={{ textAlign: 'center' }}>Recent Masterpieces</h2>
          <div className="coverflow-carousel-container">
            {loading ? (
              <div className="loading-state">Loading masterpieces...</div>
            ) : submissions.length === 0 ? (
              <div className="empty-state">
                <p>No community paintings yet.</p>
                <button className="primary-btn" onClick={() => navigate('/create')}>Be the first!</button>
              </div>
            ) : (
              <>
                <div className="coverflow-carousel">
                  {submissions.map((sub, idx) => {
                    const offset = idx - activePostIdx;
                    const absOffset = Math.abs(offset);
                    const isActive = offset === 0;
                    
                    // Calculations for 3D effect
                    const translateX = offset * 230; // Distance between cards
                    const scale = isActive ? 1 : Math.max(0.6, 1 - (absOffset * 0.2));
                    const zIndex = 100 - absOffset;
                    const opacity = absOffset > 2 ? 0 : (isActive ? 1 : 0.6);
                    
                    return (
                      <div 
                        key={sub.id} 
                        className={`coverflow-item ${isActive ? 'active' : ''}`}
                        style={{
                          transform: `translateX(${translateX}px) scale(${scale})`,
                          zIndex,
                          opacity,
                          pointerEvents: absOffset > 2 ? 'none' : 'auto',
                          cursor: isActive ? 'default' : 'pointer'
                        }}
                        onClick={() => { if (!isActive) setActivePostIdx(idx) }}
                      >
                        <div className="coverflow-img-wrapper">
                          <img 
                            src={sub.paintings?.painted_canvas_url || sub.paintings?.template_image_url} 
                            alt={sub.paintings?.name} 
                            className="coverflow-img"
                          />
                        </div>
                        
                        {/* Only show details clearly on the active card */}
                        <div className="coverflow-content" style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}>
                          <div className="coverflow-info">
                            <h3>{sub.paintings?.name || 'Masterpiece'}</h3>
                            <p>by {sub.user_display_name}</p>
                          </div>
                          
                          <button 
                            className="scroll-vote-btn"
                            onClick={(e) => { e.stopPropagation(); handleVote(sub.id); }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            {sub.votes}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Carousel Navigation Buttons */}
                <div className="carousel-nav-buttons">
                  <button 
                    className="carousel-nav-btn" 
                    onClick={() => setActivePostIdx(prev => Math.max(0, prev - 1))}
                    disabled={activePostIdx === 0}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"></line>
                      <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                  </button>
                  <button 
                    className="carousel-nav-btn" 
                    onClick={() => setActivePostIdx(prev => Math.min(submissions.length - 1, prev + 1))}
                    disabled={activePostIdx === submissions.length - 1}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityPage;
