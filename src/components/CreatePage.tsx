import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { generatePaintByNumbers, generatePaintByNumbersML, PBNOptions } from '../services/paintByNumbersService';
import { usePBNResult } from '../context/PBNContext';
import './CreatePage.css';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setResult } = usePBNResult();

  const [modelType, setModelType] = useState<'local' | 'ml'>('local');
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [nColors, setNColors] = useState(12);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modelType === 'ml' && nColors > 20) {
      setNColors(20);
    }
  }, [modelType, nColors]);

  // Smooth trailing spotlight effect (same as landing page)
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let spotlightX = 0;
    let spotlightY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const animateSpotlight = () => {
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

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleGenerate = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setProgressPercent(0);
    setProgressStage('Initializing...');

    try {
      const actualColors = nColors > 20 ? 30 : nColors;
      const options: PBNOptions = { nColors: actualColors, difficulty };
      
      const result = modelType === 'ml'
        ? await generatePaintByNumbersML(
            selectedFile,
            options,
            (stage, percent) => {
              setProgressStage(stage);
              setProgressPercent(percent);
            }
          )
        : await generatePaintByNumbers(
            selectedFile,
            options,
            (stage, percent) => {
              setProgressStage(stage);
              setProgressPercent(percent);
            }
          );

      setResult(result);
      navigate('/results');
    } catch (err: any) {
      console.error('Generation failed:', err);
      let errorMsg = 'Something went wrong during processing. Please try again.';
      if (modelType === 'ml') {
        errorMsg = `AI Generation failed: ${err.message || err}\n\nPlease ensure your local FastAPI backend is running at http://localhost:8000.\n\nQuick setup: run "uvicorn main:app --reload" inside your "ML Model" directory!`;
      }
      alert(errorMsg);
      setIsProcessing(false);
    }
  };

  const difficultyOptions = [
    {
      level: 1 as const,
      title: 'Easy',
      desc: 'Fewer, larger regions. Perfect for beginners.',
      detail: 'Relaxing & meditative',
    },
    {
      level: 2 as const,
      title: 'Medium',
      desc: 'Balanced detail. The sweet spot for most photos.',
      detail: 'Recommended',
      recommended: true,
    },
    {
      level: 3 as const,
      title: 'Hard',
      desc: 'Maximum detail & precision. For experienced painters.',
      detail: 'Photorealistic results',
    },
  ];

  return (
    <div className="create-container">
      {/* Global Spotlight (mouse glow) */}
      <div className="create-spotlight" />

      {/* Background Effects */}
      <div className="create-bg-glow create-bg-glow-1" />
      <div className="create-bg-glow create-bg-glow-2" />

      {/* Nav */}
      <nav className="create-nav">
        <div className="create-nav-logo" onClick={() => navigate('/')}>
          PaintByNumbers.AI
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/')}
            style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '50px' }}
          >
            ← Back to Home
          </button>
          {user && (
            <button
              className="btn btn-secondary"
              onClick={async () => { await logout(); navigate('/'); }}
              style={{ padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '50px' }}
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="create-content">
        <div className="create-header">
          <h1>Create Your <span className="create-gradient-text">Masterpiece</span></h1>
          <p>Upload a photo, choose your settings, and let the AI do the magic.</p>
        </div>

        {/* Upload Section */}
        <div className="create-section">
          <h2 className="create-section-title">
            <span className="create-section-number">01</span>
            Choose Your Image
          </h2>
          <div
            className={`create-dropzone ${isDragging ? 'dragging' : ''} ${preview ? 'has-image' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="create-preview-wrap">
                <img src={preview} alt="Selected" className="create-preview-img" />
                <div className="create-preview-overlay">
                  <span>Click or drop to change</span>
                </div>
              </div>
            ) : (
              <div className="create-dropzone-content">
                <div className="create-dropzone-icon">Upload</div>
                <p className="create-dropzone-text">Drag & drop your photo here</p>
                <p className="create-dropzone-sub">or click to browse files</p>
                <div className="create-dropzone-formats">PNG, JPG, WEBP supported</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        </div>

        {/* Model Selection Section */}
        <div className="create-section">
          <h2 className="create-section-title">
            <span className="create-section-number">02</span>
            Choose Generation Model
          </h2>
          <div className="create-difficulty-grid">
            <div
              className={`create-difficulty-card ${modelType === 'local' ? 'active' : ''}`}
              onClick={() => setModelType('local')}
            >
              <h3>Standard Model (Local)</h3>
              <p className="create-difficulty-desc">
                Fast, runs directly in your browser. Perfect for instant offline results.
              </p>
              <span className="create-difficulty-detail">Local K-Means Algorithm</span>
            </div>
            <div
              className={`create-difficulty-card ${modelType === 'ml' ? 'active' : ''} recommended`}
              onClick={() => setModelType('ml')}
            >
              <div className="create-recommended-badge">Premium AI</div>
              <h3>AI Segmentation (SAM)</h3>
              <p className="create-difficulty-desc">
                Meta's Segment Anything Model (SAM) recognizes semantic shapes and objects for professional-grade templates.
              </p>
              <span className="create-difficulty-detail">Requires Local FastAPI Server</span>
            </div>
          </div>
        </div>

        {/* Difficulty Section */}
        <div className="create-section">
          <h2 className="create-section-title">
            <span className="create-section-number">03</span>
            Select Difficulty
          </h2>
          <div className="create-difficulty-grid">
            {difficultyOptions.map((opt) => (
              <div
                key={opt.level}
                className={`create-difficulty-card ${difficulty === opt.level ? 'active' : ''} ${opt.recommended ? 'recommended' : ''}`}
                onClick={() => setDifficulty(opt.level)}
              >
                {opt.recommended && <div className="create-recommended-badge">Recommended</div>}
                <h3>{opt.title}</h3>
                <p className="create-difficulty-desc">{opt.desc}</p>
                <span className="create-difficulty-detail">{opt.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Count Section */}
        <div className="create-section">
          <h2 className="create-section-title">
            <span className="create-section-number">04</span>
            Number of Colors
          </h2>
          <div className="create-slider-wrap">
            <div className="create-slider-value">{nColors > 20 ? '20+' : nColors}</div>
            <input
              type="range"
              min={8}
              max={modelType === 'local' ? 21 : 20}
              value={nColors}
              onChange={(e) => setNColors(Number(e.target.value))}
              className="create-slider"
            />
            <div className="create-slider-labels">
              <span>8 (Minimal)</span>
              <span>14 (Balanced)</span>
              <span>{modelType === 'local' ? '20+' : '20 (Detailed)'}</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <button
          className={`create-generate-btn ${!selectedFile ? 'disabled' : ''}`}
          disabled={!selectedFile || isProcessing}
          onClick={handleGenerate}
        >

          Generate Paint-By-Numbers

        </button>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="create-processing-overlay">
          <div className="create-processing-modal">
            <div className="create-processing-spinner">
              <div className="create-spinner-ring" />
              <div className="create-spinner-percent">{progressPercent}%</div>
            </div>
            <h2>Creating Your Masterpiece</h2>
            <p className="create-processing-stage">{progressStage}</p>
            <div className="create-progress-bar">
              <div
                className="create-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="create-processing-tip">
              Tip: Higher color counts produce more detailed results but take longer.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePage;
