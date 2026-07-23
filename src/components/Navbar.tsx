import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';


const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isCommunity = location.pathname.startsWith('/community');
  const isProfile = location.pathname.startsWith('/profile');
  const hasActive = isCommunity || isProfile;
  const activeIndex = isCommunity ? 0 : isProfile ? 1 : -1;

  const showBackButton = ['/create', '/paint', '/results'].some(path => location.pathname.startsWith(path));
  const leftAction = showBackButton ? (
    <button className="navbar-btn navbar-btn-secondary" onClick={() => navigate(-1)} style={{ gap: '6px' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back
    </button>
  ) : null;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (location.pathname.startsWith('/paint')) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {leftAction}
      </div>

      <div className="navbar-center">
        {location.pathname !== '/' && (
          <div className="navbar-circle-logo" onClick={() => navigate('/')} title="PaintByNumbers.AI">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.06 0 1.94-.96 1.84-2.01l-.22-2.18c-.08-.75.48-1.4 1.23-1.4h1.72c3.55 0 6.43-2.88 6.43-6.43C23 6.4 18.06 2 12 2z"></path>
              <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"></circle>
              <circle cx="10.5" cy="6.5" r="1.5" fill="currentColor"></circle>
              <circle cx="15.5" cy="7.5" r="1.5" fill="currentColor"></circle>
              <circle cx="18.5" cy="11.5" r="1.5" fill="currentColor"></circle>
            </svg>
          </div>
        )}
        {user && (
          <div className="navbar-center-capsule">
            <div 
              className="capsule-slider" 
              style={{
                left: activeIndex === 0 ? '4px' : activeIndex === 1 ? '50%' : '4px',
                opacity: hasActive ? 1 : 0
              }}
            />
            <button 
              className={`capsule-btn ${isCommunity ? 'active' : ''}`}
              onClick={() => navigate('/community')}
            >
              Community
            </button>
            <button 
              className={`capsule-btn ${isProfile ? 'active' : ''}`}
              onClick={() => navigate('/profile')}
            >
              Home
            </button>
          </div>
        )}
      </div>

      <div className="navbar-right">
        {user ? (
          <button className="navbar-btn navbar-btn-secondary" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <button 
            className="navbar-btn navbar-btn-secondary" 
            onClick={() => navigate('/login', { state: { from: location } })}
          >
            Login / Sign Up
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
