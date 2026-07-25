import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import HoverMaskReveal from "./HoverMaskReveal";
import LiquidEther from "./LiquidEther";
import PaintingShowcase from "./PaintingShowcase";
import { getFeaturedPost, CommunityPostSubmission } from "../services/communityService";
import "./LandingPage.css";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  useAuth();
  const [winner, setWinner] = useState<CommunityPostSubmission | null>(null);

  const heroImageRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  // Fetch winner
  useEffect(() => {
    const fetchWinner = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const data = await getFeaturedPost(currentMonth);
      if (data) setWinner(data);
    };
    fetchWinner();
  }, []);

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
            {winner && winner.paintings ? (
              <>
                <div style={{ position: 'absolute', top: 40, left: 40, zIndex: 10, background: 'rgba(255,255,255,0.8)', padding: '10px 20px', borderRadius: 30, backdropFilter: 'blur(10px)', fontWeight: 'bold' }}>
                  🏆 Community Winner: {winner.user_display_name}
                </div>
                <HoverMaskReveal
                  baseImage={winner.paintings.template_image_url}
                  revealImage={winner.paintings.painted_canvas_url || winner.paintings.original_image_url}
                  blobRadius={0.25}
                  fadeSpeed={3.5}
                />
              </>
            ) : (
              <HoverMaskReveal
                baseImage="/pbn-template.png"
                revealImage="/pbn-original.png"
                blobRadius={0.25}
                fadeSpeed={3.5}
              />
            )}
          </div>

          <div ref={scrollIndicatorRef} className="hero-scroll-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </section>
      </div>

      {/* The below thing that comes up */}
      <div className="content-wrapper" style={{ position: 'relative', zIndex: 10, paddingBottom: '60px' }}>

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
                <h3>1. Upload Your Image</h3>
                <p>Drag & drop or select any photograph. Our AI instantly processes your image, intelligently mapping outlines while preserving key details and edge fidelity.</p>
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
                <h3>2. Refine Your Canvas</h3>
                <p>Select your preferred detail level and customize your palette size from 8 to 20 colors to perfectly match your desired painting style and complexity.</p>
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
                <h3>3. Print & Create</h3>
                <p>Export your high-resolution numbered template, matching color keys, and reference guide. Print on physical canvas or paint digitally.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Community Painting Showcase */}
        <section id="features" className="section" style={{ padding: '60px 0' }}>
          <div className="section-header">
            <h2>Community Creations</h2>
            <p>See what our artists are painting — your masterpiece could be here too</p>
          </div>

          <PaintingShowcase height="650px" />
        </section>

        {/* AI Engine Comparison */}
        <section id="pricing" className="section">
          <div className="section-header">
            <h2>Select Your AI Engine</h2>
            <p>Two distinct architectures tailored for your creative workflow</p>
          </div>

          <div className="level-cards">
            <div className="card">
              <h3>Solera</h3>
              <div style={{ color: '#D4798A', marginBottom: '16px', fontWeight: 'bold' }}>Instant & Unlimited</div>
              <ul className="card-features">
                <li>Fast and private — your photos never leave your device</li>
                <li>Instantly turns your photo into a paintable canvas</li>
                <li>Great for fun, simple, and abstract painting projects</li>
                <li>Create as many templates as you want, absolutely free</li>
              </ul>
            </div>

            <div className="card popular" style={{ opacity: 0.65, cursor: 'not-allowed' }}>
              <div className="popular-badge" style={{ background: '#718096', boxShadow: 'none' }}>Coming Soon</div>
              <h3>Lumis</h3>
              <div style={{ color: '#D4798A', marginBottom: '16px', fontWeight: 'bold' }}>2 gen/day</div>
              <ul className="card-features">
                <li>Advanced processing for stunning, true-to-life results</li>
                <li>Perfectly captures the finest details and subtle colors of your photo</li>
                <li>Delivers crisp, easy-to-follow lines for a professional finish</li>
                <li>Blends colors smoothly for a beautiful, realistic masterpiece</li>
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


      </div>
    </div>
  );
};

export default LandingPage;