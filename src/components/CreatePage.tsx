import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generatePaintByNumbers, PBNOptions } from '../services/paintByNumbersService';
import { usePBNResult } from '../context/PBNContext';
import './CreatePage.css';

const CreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { setResult } = usePBNResult();

  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(2);
  const [nColors, setNColors] = useState(12);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const options: PBNOptions = { nColors, difficulty };
      const result = await generatePaintByNumbers(
        selectedFile,
        options,
        (stage, percent) => {
          setProgressStage(stage);
          setProgressPercent(percent);
        }
      );
      setResult(result);
      navigate('/results');
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Something went wrong during processing. Please try again.');
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
        <button className="create-nav-back" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
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

        {/* Difficulty Section */}
        <div className="create-section">
          <h2 className="create-section-title">
            <span className="create-section-number">02</span>
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
            <span className="create-section-number">03</span>
            Number of Colors
          </h2>
          <div className="create-slider-wrap">
            <div className="create-slider-value">{nColors}</div>
            <input
              type="range"
              min={8}
              max={20}
              value={nColors}
              onChange={(e) => setNColors(Number(e.target.value))}
              className="create-slider"
            />
            <div className="create-slider-labels">
              <span>8 (Minimal)</span>
              <span>14 (Balanced)</span>
              <span>20 (Detailed)</span>
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
