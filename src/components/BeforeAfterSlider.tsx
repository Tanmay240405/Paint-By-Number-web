import React, { useState, useRef, useCallback } from 'react';
import './BeforeAfterSlider.css';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Paint-By-Numbers',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) updatePosition(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    updatePosition(e.touches[0].clientX);
  };

  const handleClick = (e: React.MouseEvent) => {
    updatePosition(e.clientX);
  };

  return (
    <div
      ref={containerRef}
      className="ba-slider"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
    >
      {/* After (Paint-by-numbers) - Full background */}
      <div className="ba-layer ba-after">
        <img src={afterImage} alt={afterLabel} draggable={false} />
      </div>

      {/* Before (Original) - Clipped by slider */}
      <div
        className="ba-layer ba-before"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img src={beforeImage} alt={beforeLabel} draggable={false} />
      </div>

      {/* Slider Line + Handle */}
      <div className="ba-divider" style={{ left: `${sliderPos}%` }}>
        <div className="ba-line" />
        <div className="ba-handle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="ba-label ba-label-left" style={{ opacity: sliderPos > 15 ? 1 : 0 }}>
        {beforeLabel}
      </div>
      <div className="ba-label ba-label-right" style={{ opacity: sliderPos < 85 ? 1 : 0 }}>
        {afterLabel}
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
