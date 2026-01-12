import React, { useState, useEffect, useRef } from "react";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
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
        <div className="logo">PaintByNumbers.AI</div>
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
          <span className="sparkle-icon">✨</span>
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
          <button className="btn btn-primary">
            Start Creating
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </button>
        </div>

        {/* Visual Placeholder for Art Demo */}
        <div className="hero-visual reveal">
          <div className="visual-card">
            <div className="visual-content">
              <h3>[ Interactive Before/After Slider ]</h3>
              <p>Drag to see the AI Transformation</p>
            </div>
          </div>
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
            <div className="step-icon">📤</div>
            <h3>Upload Photo</h3>
            <p>Choose any photo from your gallery. Our AI automatically optimizes contrast and color balance.</p>
          </div>
          <div className="step-card reveal" style={{ transitionDelay: '0.1s' }}>
            <div className="step-number">02</div>
            <div className="step-icon">🎛️</div>
            <h3>Customize</h3>
            <p>Select your difficulty level and palette size. Watch the preview update in real-time.</p>
          </div>
          <div className="step-card reveal" style={{ transitionDelay: '0.2s' }}>
            <div className="step-number">03</div>
            <div className="step-icon">🎨</div>
            <h3>Paint & Enjoy</h3>
            <p>Download your numbered guide and palette sheet. Print it out and start painting!</p>
          </div>
        </div>
      </section>

      {/* Modern Bento Grid Features */}
      <section id="features" className="section">
        <div className="section-header reveal">
          <h2>Our Features</h2>
          <p>Made for everyone, no matter you are a professional artist or a beginner</p>
        </div>
        
        <div className="bento-grid">
          <div className="bento-item large reveal">
            <span className="bento-icon">🧠</span>
            <h3>Smart Segmentation AI</h3>
            <p>Our proprietary algorithm understands object boundaries better than any other tool, ensuring your painting looks like the original photo, not a jagged mess.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">⚡</span>
            <h3>Instant Processing</h3>
            <p>Generate high-res vector PDFs in under 5 seconds.</p>
          </div>
          
          <div className="bento-item tall reveal">
            <span className="bento-icon">🎨</span>
            <h3>Dynamic Color Matching</h3>
            <p>We automatically match colors to major paint brands like Liquitex, Golden, and Winsor & Newton. No more guessing which acrylics to buy.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">📐</span>
            <h3>Vector Output</h3>
            <p>Scale your canvas to any size without losing quality.</p>
          </div>
          
          <div className="bento-item reveal">
            <span className="bento-icon">💾</span>
            <h3>Cloud Save</h3>
            <p>Start on your phone, finish adjusting on your desktop.</p>
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
            <h3>Beginner</h3>
            <div style={{color: '#a5b4fc', marginBottom: '16px', fontWeight: 'bold'}}>Level 1</div>
            <ul className="card-features">
              <li>20-30 Colors</li>
              <li>Larger painting zones</li>
              <li>Estimated: 2-3 Hours</li>
              <li>Printable PDF Guide</li>
            </ul>
          </div>

          <div 
            className={`card popular ${selectedLevel === 2 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(2)}
          >
            <div className="popular-badge">Most Popular</div>
            <h3>Intermediate</h3>
            <div style={{color: '#a5b4fc', marginBottom: '16px', fontWeight: 'bold'}}>Level 2</div>
            <ul className="card-features">
              <li>40-60 Colors</li>
              <li>Balanced detail</li>
              <li>Estimated: 5-8 Hours</li>
              <li>Printable PDF Guide</li>
              <li>Color mixing guide</li>
            </ul>
          </div>

          <div 
            className={`card ${selectedLevel === 3 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(3)}
          >
            <h3>Expert</h3>
            <div style={{color: '#a5b4fc', marginBottom: '16px', fontWeight: 'bold'}}>Level 3</div>
            <ul className="card-features">
              <li>80+ Colors</li>
              <li>Photorealistic detail</li>
              <li>Estimated: 15+ Hours</li>
              <li>Vector SVG Download</li>
              <li>Commercial License</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="cta-banner reveal">
        <h2>Ready to Create?</h2>
        <p style={{marginBottom: '32px', color: 'rgba(255,255,255,0.7)'}}>Click on the button below</p>
        <button className="btn btn-primary" style={{margin: '0 auto'}}>
          Get Started for Free
        </button>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div>
            <div className="logo" style={{marginBottom: '20px', display: 'inline-block'}}>PaintByNumbers.AI</div>
            <p style={{color: 'rgba(255,255,255,0.5)', maxWidth: '300px'}}>
              Making art accessible to everyone through the power of artificial intelligence.
            </p>
          </div>
          <div>
            <h4 style={{marginBottom: '20px'}}>Product</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <a href="#" style={{color: 'rgba(255,255,255,0.6)', textDecoration: 'none'}}>Features</a>
              <a href="#" style={{color: 'rgba(255,255,255,0.6)', textDecoration: 'none'}}>Showcase</a>
              <a href="#" style={{color: 'rgba(255,255,255,0.6)', textDecoration: 'none'}}>Pricing</a>
            </div>
          </div>
          <div>
            <h4 style={{marginBottom: '20px'}}>Legal</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <a href="#" style={{color: 'rgba(255,255,255,0.6)', textDecoration: 'none'}}>Privacy Policy</a>
              <a href="#" style={{color: 'rgba(255,255,255,0.6)', textDecoration: 'none'}}>Terms of Service</a>
            </div>
          </div>
        </div>
        <div style={{textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem'}}>
          © 2026 Paint By Numbers AI.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;