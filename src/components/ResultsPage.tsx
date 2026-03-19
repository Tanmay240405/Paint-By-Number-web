import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePBNResult } from '../context/PBNContext';
import './ResultsPage.css';

type TabKey = 'template' | 'palette' | 'reference' | 'original';

const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const { result } = usePBNResult();
  const [activeTab, setActiveTab] = useState<TabKey>('template');

  if (!result) {
    return (
      <div className="results-container">
        <div className="results-empty">
          <div className="results-empty-icon">—</div>
          <h2>No results yet</h2>
          <p>Generate a paint-by-numbers template first.</p>
          <button className="results-btn results-btn-primary" onClick={() => navigate('/create')}>
            Start Creating
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'template', label: 'Template', icon: '' },
    { key: 'palette', label: 'Palette', icon: '' },
    { key: 'reference', label: 'Reference', icon: '' },
    { key: 'original', label: 'Original', icon: '' },
  ];

  const imageMap: Record<TabKey, string> = {
    template: result.templateDataUrl,
    palette: result.paletteDataUrl,
    reference: result.referenceDataUrl,
    original: result.originalDataUrl,
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const downloadAll = () => {
    downloadImage(result.templateDataUrl, 'paint-template.png');
    setTimeout(() => downloadImage(result.paletteDataUrl, 'color-palette.png'), 200);
    setTimeout(() => downloadImage(result.referenceDataUrl, 'colored-reference.png'), 400);
    setTimeout(() => downloadImage(result.originalDataUrl, 'original.png'), 600);
  };

  return (
    <div className="results-container">
      <div className="results-bg-glow results-bg-glow-1" />
      <div className="results-bg-glow results-bg-glow-2" />

      {/* Nav */}
      <nav className="results-nav">
        <div className="results-nav-logo" onClick={() => navigate('/')}>
          PaintByNumbers.AI
        </div>
        <button className="results-nav-back" onClick={() => navigate('/create')}>
          ← Create Another
        </button>
      </nav>

      <div className="results-content">
        {/* Header */}
        <div className="results-header">
          <h1>Your <span className="results-gradient-text">Masterpiece</span> is Ready!</h1>
          <p>Download your paint-by-numbers template and start painting.</p>
        </div>

        {/* Stats Bar */}
        <div className="results-stats">
          <div className="results-stat">
            <span className="results-stat-value">{result.metrics.totalRegions}</span>
            <span className="results-stat-label">Regions</span>
          </div>
          <div className="results-stat-divider" />
          <div className="results-stat">
            <span className="results-stat-value">{result.palette.length}</span>
            <span className="results-stat-label">Colors</span>
          </div>
          <div className="results-stat-divider" />
          <div className="results-stat">
            <span className="results-stat-value">{result.metrics.avgRegionSize}</span>
            <span className="results-stat-label">Avg. Region Size</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="results-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`results-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="results-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Image Display */}
        <div className="results-display">
          <img
            src={imageMap[activeTab]}
            alt={activeTab}
            className="results-main-image"
          />
        </div>

        {/* Color Palette Swatches */}
        <div className="results-palette-section">
          <h3 className="results-palette-title">Color Palette</h3>
          <div className="results-swatches">
            {result.palette.map((c) => (
              <div key={c.index} className="results-swatch">
                <div
                  className="results-swatch-color"
                  style={{ background: c.hex }}
                >
                  <span className="results-swatch-num">{c.index}</span>
                </div>
                <span className="results-swatch-hex">{c.hex}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Download Buttons */}
        <div className="results-actions">
          <button
            className="results-btn results-btn-secondary"
            onClick={() => downloadImage(imageMap[activeTab], `${activeTab}.png`)}
          >
            Download {tabs.find(t => t.key === activeTab)?.label}
          </button>
          <button
            className="results-btn results-btn-primary"
            onClick={downloadAll}
          >
            Download All Files
          </button>
        </div>

        {/* Create Another */}
        <div className="results-footer-cta">
          <button
            className="results-btn results-btn-outline"
            onClick={() => navigate('/create')}
          >
            Create Another Masterpiece
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
