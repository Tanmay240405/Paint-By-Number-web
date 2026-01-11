import React, { useState } from "react";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo">PaintByNumbers.AI</div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#examples">Examples</a>
          <a href="#pricing">Pricing</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-badge">Powered by AI ✨</div>
        <h1>Transform Photos into<br /><span className="gradient-text">Paint-by-Numbers Art</span></h1>
        <p>
          Upload any image and watch as AI converts it into a numbered canvas ready for painting.
          Perfect for artists of all skill levels.
        </p>
        <div className="cta-buttons">
          <button className="primary-btn">
            <span>Get Started Free</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="secondary-btn">See Examples</button>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-number">AI-Powered</div>
            <div className="stat-label">Smart Segmentation</div>
          </div>
          <div className="stat">
            <div className="stat-number">Instant</div>
            <div className="stat-label">Processing Time</div>
          </div>
          <div className="stat">
            <div className="stat-number">3 Levels</div>
            <div className="stat-label">Difficulty Options</div>
          </div>
        </div>
      </header>

      <section className="levels">
        <div className="section-header">
          <h2>Choose Your Difficulty Level</h2>
          <p>Select the complexity that matches your skill and patience</p>
        </div>
        <div className="level-cards">
          <div 
            className={`card ${selectedLevel === 1 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(1)}
          >
            <div className="card-icon">🌱</div>
            <h3>Beginner</h3>
            <div className="card-difficulty">Level 1</div>
            <p>Simple shapes and fewer colors. Perfect for newcomers and quick projects.</p>
            <ul className="card-features">
              <li>20-30 colors</li>
              <li>Large regions</li>
              <li>2-3 hours</li>
            </ul>
          </div>

          <div 
            className={`card ${selectedLevel === 2 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(2)}
          >
            <div className="card-icon">🎨</div>
            <h3>Intermediate</h3>
            <div className="card-difficulty">Level 2</div>
            <p>Balanced detail with richer colors. Great for weekend projects.</p>
            <ul className="card-features">
              <li>40-60 colors</li>
              <li>Medium regions</li>
              <li>5-8 hours</li>
            </ul>
          </div>

          <div 
            className={`card ${selectedLevel === 3 ? 'selected' : ''}`}
            onClick={() => setSelectedLevel(3)}
          >
            <div className="card-icon">🏆</div>
            <h3>Advanced</h3>
            <div className="card-difficulty">Level 3</div>
            <p>High detail with intricate regions. For experienced painters.</p>
            <ul className="card-features">
              <li>80-120 colors</li>
              <li>Small regions</li>
              <li>15+ hours</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="section-header">
          <h2>Powered by Advanced AI</h2>
          <p>Everything you need to create stunning paint-by-numbers art</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>Smart Segmentation</h3>
            <p>Our AI intelligently identifies regions and boundaries for optimal painting experience</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Customizable Detail</h3>
            <p>Adjust complexity levels to match your skill and available time</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🖨️</div>
            <h3>Print Ready</h3>
            <p>High-resolution output optimized for printing on any canvas size</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>Color Matching</h3>
            <p>Auto-generated palettes matched to standard paint brands</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Processing</h3>
            <p>Generate your canvas in seconds, not hours</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>Save & Edit</h3>
            <p>Store your designs and make adjustments anytime</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Create Your Masterpiece?</h2>
        <p>Join thousands of artists bringing their photos to life</p>
        <button className="primary-btn large">
          <span>Start Creating Now</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>PaintByNumbers.AI</h4>
            <p>Transforming photos into art since 2024</p>
          </div>
          <div className="footer-section">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#examples">Examples</a>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <a href="#about">About</a>
            <a href="#blog">Blog</a>
            <a href="#contact">Contact</a>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Paint By Numbers AI. Built with ❤️ and Machine Learning</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;