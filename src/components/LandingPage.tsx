import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BeforeAfterSlider from "./BeforeAfterSlider";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<number>(2);

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

  // Scroll Reveal Animation Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="container">
      {/* The Global Spotlight Element */}
      <div className="global-spotlight" />

      <nav className="navbar">
        <div className="logo">PaintByNumbers</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Level</a>
        </div>
        <button className="btn btn-secondary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>
          Sign In
        </button>
      </nav>

      <header className="hero">
        <div className="hero-pill reveal">
          <span>V1.0  Available </span>
        </div>
        
        <h1 className="reveal">
          Turn Photos into<br />
          <span className="gradient-text">Paint-By-Number Masterpiece</span>
        </h1>
        
        <p className="reveal">
          AI that converts your photos into 
          paint-by-number kits.
        </p>

        <div className="cta-group reveal">
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            Start Creating
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>

        <div className="hero-visual reveal">
          <BeforeAfterSlider
            beforeImage="/pbn-original.png"
            afterImage="/pbn-template.png"
            beforeLabel="Original"
            afterLabel="Paint-By-Numbers"
          />
        </div>
      </header>

      {/* How It Works - Step Cards */}
      <section id="how-it-works" className="section">
        <div className="section-header reveal">
          <h2>From Photo to Canvas</h2>
          <p>Three simple steps to unleash your inner artist</p>
        </div>
        
        <div className="steps-grid">
          <div className="step-card reveal">
            <div className="step-number">01</div>
            <div className="step-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
            <h3>Upload Photo</h3>
            <p>Choose any photo from your gallery. Drag & drop or click to upload — PNG, JPG, and WEBP supported.</p>
          </div>
          <div className="step-card reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="step-number">02</div>
            <div className="step-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="19" cy="15" r="2"></circle><circle cx="7" cy="14" r="3"></circle><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path></svg>
            </div>
            <h3>Customize</h3>
            <p>Pick your difficulty level and choose between 8 to 20 colors for your palette.</p>
          </div>
          <div className="step-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="step-number">03</div>
            <div className="step-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </div>
            <h3>Download & Paint</h3>
            <p>Download your numbered template, color palette, and reference image. Print it out and start painting!</p>
          </div>
        </div>
      </section>

      {/* Modern Bento Grid Features */}
      <section id="features" className="section">
        <div className="section-header reveal">
          <h2>Our Features</h2>
          <p>Made for everyone, whether you're a professional artist or a beginner</p>
        </div>
        
        <div className="bento-grid">
          <div className="bento-item large reveal">
            <span className="bento-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5L14 12H10l0-2.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z"></path><rect x="9" y="12" width="6" height="3" rx="1"></rect><path d="M10 15v2a2 2 0 1 0 4 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            </span>
            <h3>AI Color Clustering</h3>
            <p>Advanced KMeans clustering in LAB color space with edge-preserving smoothing to create clean, paintable regions that stay true to your original photo.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </span>
            <h3>In-Browser Processing</h3>
            <p>Everything runs locally in your browser — no uploads, no servers, complete privacy.</p>
          </div>
          
          <div className="bento-item tall reveal">
            <span className="bento-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="19" cy="15" r="2"></circle><circle cx="7" cy="14" r="3"></circle><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path></svg>
            </span>
            <h3>Smart Color Palette</h3>
            <p>Automatically extracts the optimal color palette from your image. Choose between 8 to 20 colors and get a detailed palette sheet with hex codes.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
            <h3>Instant Downloads</h3>
            <p>Download your numbered template, palette, and colored reference as PNG images.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="12" y2="14"></line></svg>
            </span>
            <h3>Numbered Regions</h3>
            <p>Each region gets a clear number label so you know exactly which color goes where.</p>
          </div>
        </div>
      </section>

      {/* Enhanced Difficulty Selection */}
      <section id="pricing" className="section">
        <div className="section-header reveal">
          <h2>Choose Your Challenge</h2>
          <p>Find the perfect balance of detail and relaxation</p>
        </div>
        
        <div className="level-cards reveal">
          <div 
            className={`card ${selectedLevel === 1 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(1)}
          >
            <h3>Easy</h3>
            <div style={{color: '#D4798A', marginBottom: '16px', fontWeight: 'bold'}}>Level 1</div>
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
            <div style={{color: '#D4798A', marginBottom: '16px', fontWeight: 'bold'}}>Level 2</div>
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
            <div style={{color: '#D4798A', marginBottom: '16px', fontWeight: 'bold'}}>Level 3</div>
            <ul className="card-features">
              <li>16–20 Colors</li>
              <li>Maximum detail & precision</li>
              <li>Photorealistic results</li>
              <li>For experienced painters</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta-banner reveal">
        <h2>Ready to Create?</h2>
        <p style={{marginBottom: '32px', color: 'rgba(255,255,255,0.7)'}}>Click on the button below</p>
        <button className="btn btn-primary" style={{margin: '0 auto'}} onClick={() => navigate('/create')}>
          Get Started for Free
        </button>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div>
            <div className="logo" style={{marginBottom: '20px', display: 'inline-block'}}>PaintByNumbers.AI</div>
            <p style={{color: 'black', maxWidth: '300px'}}>
              Making art accessible to everyone through the power of artificial intelligence.
            </p>
          </div>
          <div>
            <h4 style={{marginBottom: '20px'}}>Product</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <span style={{color: 'black', cursor: 'pointer'}}>Features</span>
              <span style={{color: 'black', cursor: 'pointer'}}>Showcase</span>
              <span style={{color: 'black', cursor: 'pointer'}}>Pricing</span>
            </div>
          </div>
          <div>
            <h4 style={{marginBottom: '20px'}}>Legal</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <span style={{color: 'black', cursor: 'pointer'}}>Privacy Policy</span>
              <span style={{color: 'black', cursor: 'pointer'}}>Terms of Service</span>
            </div>
          </div>
        </div>
        <div style={{textAlign: 'center', color: 'black', fontSize: '0.9rem'}}>
          © 2026 Paint By Numbers AI.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;