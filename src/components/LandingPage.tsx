import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HoverMaskReveal from "./HoverMaskReveal";
import LiquidEther from "./LiquidEther";
import HTMLCircularGallery from "./HTMLCircularGallery";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedLevel, setSelectedLevel] = useState<number>(2);

  const heroImageRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  // Scroll Animation for Hero Image
  useEffect(() => {
    let ticking = false;
    const vh = window.innerHeight || 800;
    const maxScroll = vh * 0.8;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
          const imageScale = 1 - (scrollProgress * 0.25);
          const imageRadius = scrollProgress * 40;

          if (heroImageRef.current) {
            heroImageRef.current.style.transform = `scale(${imageScale})`;
            heroImageRef.current.style.borderRadius = `${imageRadius}px`;
          }
          if (scrollIndicatorRef.current) {
            scrollIndicatorRef.current.style.opacity = `${1 - scrollProgress * 3}`;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Trigger initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 1. Mouse Position Tracker for Global Spotlight
  // 1. SMOOTH TRAILING SPOTLIGHT EFFECT
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let spotlightX = 0;
    let spotlightY = 0;

    // Just update coordinates on mouse move, don't render yet
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    // Animation loop to make the spotlight "chase" the mouse
    const animateSpotlight = () => {
      // The 0.1 factor controls the lag. Lower = more lag/smoother.
      const speed = 0.1;

      spotlightX += (mouseX - spotlightX) * speed;
      spotlightY += (mouseY - spotlightY) * speed;

      document.documentElement.style.setProperty('--mouse-x', `${spotlightX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${spotlightY}px`);

      requestAnimationFrame(animateSpotlight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    const animationId = requestAnimationFrame(animateSpotlight);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);



  return (
    <div className="container">
      {/* Fixed Auth Button */}
      <div style={{ position: 'fixed', top: '30px', right: '40px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user ? (
          <>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--text-main, #1E1E2A)',
              background: 'rgba(30, 30, 42, 0.05)',
              padding: '10px 20px',
              borderRadius: '50px',
              border: '1px solid rgba(30, 30, 42, 0.08)',
              backdropFilter: 'blur(10px)',
            }}>
              Hello, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'there'}
            </span>
            <button
              className="btn btn-secondary"
              onClick={async () => { await logout(); }}
              style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '50px' }}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/login')}
            style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)', borderRadius: '50px' }}
          >
            Login / Sign Up
          </button>
        )}
      </div>

      {/* Scrollable Hero Wrapper */}
      <div className="hero-scroll-wrapper" style={{ height: '180vh', position: 'relative' }}>
        <section className="hero-sticky" style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <div
            ref={heroImageRef}
            className="hero-image-container"
            style={{
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
              willChange: 'transform, border-radius'
            }}
          >
            <HoverMaskReveal
              baseImage="/pbn-template.png"
              revealImage="/pbn-original.png"
              blobRadius={0.25}
              fadeSpeed={3.5}
            />
          </div>

          <div ref={scrollIndicatorRef} className="hero-scroll-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </section>
      </div>

      {/* The below thing that comes up */}
      <div className="content-wrapper" style={{ position: 'relative', zIndex: 10 }}>

        <section className="intro-heading-section section" style={{ paddingBottom: '20px', paddingTop: '80px' }}>
          <h1 className="main-title gradient-text" style={{
            fontSize: 'clamp(3rem, 10vw, 7rem)',
            fontWeight: 900,
            textAlign: 'center',
            margin: 0,
            letterSpacing: '-0.04em',
          }}>
            Paint By Numbers
          </h1>
        </section>

        {/* How It Works - Step Cards */}
        <section id="how-it-works" className="section">
          <div className="section-header">
            <h2>From Photo to Canvas</h2>
            <p>Three simple steps to unleash your inner artist</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div style={{ position: 'absolute', inset: -20, zIndex: 0, opacity: 0.6, filter: 'blur(10px)' }}>
                <LiquidEther
                  colors={['#F5E6DD', '#EAD5DA']}
                  resolution={0.3}
                  isViscous={true}
                  viscous={80}
                  mouseForce={5}
                  autoIntensity={0.5}
                />
              </div>
              <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <div className="step-number">01</div>
                <div className="step-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
                <h3>Upload Photo</h3>
                <p>Choose any photo from your gallery. Drag & drop or click to upload — PNG, JPG, and WEBP supported.</p>
              </div>
            </div>
            <div className="step-card" style={{ transitionDelay: '0.1s' }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.3, mixBlendMode: 'multiply' }}>
                <LiquidEther
                  colors={['#E8C4A0', '#D4798A']}
                  resolution={0.3}
                  isViscous={true}
                  viscous={40}
                  mouseForce={15}
                />
              </div>
              <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <div className="step-number">02</div>
                <div className="step-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="19" cy="15" r="2"></circle><circle cx="7" cy="14" r="3"></circle><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path></svg>
                </div>
                <h3>Customize</h3>
                <p>Pick your difficulty level and choose between 8 to 20 colors for your palette.</p>
              </div>
            </div>
            <div className="step-card" style={{ transitionDelay: '0.2s' }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.3, mixBlendMode: 'multiply' }}>
                <LiquidEther
                  colors={['#E8C4A0', '#D4798A']}
                  resolution={0.3}
                  isViscous={true}
                  viscous={40}
                  mouseForce={15}
                />
              </div>
              <div style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
                <div className="step-number">03</div>
                <div className="step-icon">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </div>
                <h3>Download & Paint</h3>
                <p>Download your numbered template, color palette, and reference image. Print it out and start painting!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Modern Bento Grid Features */}
        <section id="features" className="section">
          <div className="section-header">
            <h2>Our Features</h2>
            <p>Made for everyone, whether you're a professional artist or a beginner</p>
          </div>

          <div>
            <HTMLCircularGallery bend={-3} startIndex={2}>
              <div className="bento-item">
                <span className="bento-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5L14 12H10l0-2.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z"></path><rect x="9" y="12" width="6" height="3" rx="1"></rect><path d="M10 15v2a2 2 0 1 0 4 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </span>
                <h3>AI Color Clustering</h3>
                <p>Advanced KMeans clustering in LAB color space with edge-preserving smoothing to create clean, paintable regions that stay true to your original photo.</p>
              </div>

              <div className="bento-item">
                <span className="bento-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                </span>
                <h3>In-Browser Processing</h3>
                <p>Everything runs locally in your browser — no uploads, no servers, complete privacy.</p>
              </div>

              <div className="bento-item">
                <span className="bento-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="19" cy="15" r="2"></circle><circle cx="7" cy="14" r="3"></circle><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path></svg>
                </span>
                <h3>Smart Color Palette</h3>
                <p>Automatically extracts the optimal color palette from your image. Choose between 8 to 20 colors and get a detailed palette sheet with hex codes.</p>
              </div>

              <div className="bento-item">
                <span className="bento-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </span>
                <h3>Instant Downloads</h3>
                <p>Download your numbered template, palette, and colored reference as PNG images.</p>
              </div>

              <div className="bento-item">
                <span className="bento-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="12" y2="14"></line></svg>
                </span>
                <h3>Numbered Regions</h3>
                <p>Each region gets a clear number label so you know exactly which color goes where.</p>
              </div>
            </HTMLCircularGallery>
          </div>
        </section>

        {/* Enhanced Difficulty Selection */}
        <section id="pricing" className="section">
          <div className="section-header">
            <h2>Choose Your Challenge</h2>
            <p>Find the perfect balance of detail and relaxation</p>
          </div>

          <div className="level-cards">
            <div
              className={`card ${selectedLevel === 1 ? 'selected' : ''}`}
              onClick={() => setSelectedLevel(1)}
            >
              <h3>Easy</h3>
              <div style={{ color: '#D4798A', marginBottom: '16px', fontWeight: 'bold' }}>Level 1</div>
              <ul className="card-features">
                <li>8–10 Colors</li>
                <li>Fewer, larger regions</li>
                <li>Relaxing & meditative</li>
                <li>Great for beginners</li>
              </ul>
            </div>

            <div
              className={`card popular ${selectedLevel === 2 ? 'selected' : ''}`}
              onClick={() => setSelectedLevel(2)}
            >
              <div className="popular-badge">Recommended</div>
              <h3>Medium</h3>
              <div style={{ color: '#D4798A', marginBottom: '16px', fontWeight: 'bold' }}>Level 2</div>
              <ul className="card-features">
                <li>12–15 Colors</li>
                <li>Balanced detail & regions</li>
                <li>Best for most photos</li>
                <li>Downloadable PNG files</li>
              </ul>
            </div>

            <div
              className={`card ${selectedLevel === 3 ? 'selected' : ''}`}
              onClick={() => setSelectedLevel(3)}
            >
              <h3>Hard</h3>
              <div style={{ color: '#D4798A', marginBottom: '16px', fontWeight: 'bold' }}>Level 3</div>
              <ul className="card-features">
                <li>16–20 Colors</li>
                <li>Maximum detail & precision</li>
                <li>Photorealistic results</li>
                <li>For experienced painters</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <h2>Ready to Create?</h2>
          <p style={{ marginBottom: '32px', color: 'rgba(255,255,255,0.7)' }}>Click on the button below</p>
          <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => navigate('/create')}>
            Get Started for Free
          </button>
        </section>

        <footer className="footer">
          <div className="footer-content">
            <div>
              <div className="logo" style={{ marginBottom: '20px', display: 'inline-block' }}>PaintByNumbers.AI</div>
              <p style={{ color: 'black', maxWidth: '300px' }}>
                Making art accessible to everyone through the power of artificial intelligence.
              </p>
            </div>
            <div>
              <h4 style={{ marginBottom: '20px' }}>Product</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ color: 'black', cursor: 'pointer' }}>Features</span>
                <span style={{ color: 'black', cursor: 'pointer' }}>Showcase</span>
                <span style={{ color: 'black', cursor: 'pointer' }}>Pricing</span>
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: '20px' }}>Legal</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ color: 'black', cursor: 'pointer' }}>Privacy Policy</span>
                <span style={{ color: 'black', cursor: 'pointer' }}>Terms of Service</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', color: 'black', fontSize: '0.9rem' }}>
            © 2026 Paint By Numbers AI.
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;