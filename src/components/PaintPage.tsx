import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePBNResult } from '../context/PBNContext';
import { useAuth } from '../context/AuthContext';
import { savePaintingProgress } from '../services/communityService';
import './PaintPage.css';

const PaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { result, activePaintingId, setActivePaintingId } = usePBNResult();
  const { user } = useAuth();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [brushSize, setBrushSize] = useState(10);
  const [activeTool, setActiveTool] = useState<'brush' | 'eraser' | 'pan'>('brush');
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom cursor state
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  
  // Panning state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);

  
  // Set initial color when result loads
  useEffect(() => {
    if (result && result.palette.length > 0) {
      setSelectedColor(result.palette[0].hex);
    }
  }, [result]);

  // Load image dimensions
  useEffect(() => {
    if (result?.templateDataUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setDimensions({ width: img.width, height: img.height });
      };
      img.src = result.templateDataUrl;
    }
  }, [result]);

  // Load saved painting strokes
  useEffect(() => {
    if (dimensions.width > 0 && result?.paintedDataUrl && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const paintedImg = new Image();
      paintedImg.crossOrigin = 'anonymous';
      paintedImg.onload = () => {
        // We do not clearRect here because user might have just resized or loaded
        // Actually, setting dimensions clears the canvas natively, so we just draw:
        ctx.drawImage(paintedImg, 0, 0, dimensions.width, dimensions.height);
      };
      paintedImg.src = result.paintedDataUrl;
    }
  }, [dimensions, result?.paintedDataUrl]);

  // Prevent default touch actions (like scrolling) on the canvas to allow drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventScroll, { passive: false });
    canvas.addEventListener('touchmove', preventScroll, { passive: false });
    
    return () => {
      canvas.removeEventListener('touchstart', preventScroll);
      canvas.removeEventListener('touchmove', preventScroll);
    };
  }, [canvasRef, dimensions]);

  if (!result) {
    return (
      <div className="paint-container" style={{ alignItems: 'center', justifyContent: 'center' }}>

        <h2>No image to paint.</h2>
        <button className="paint-btn paint-btn-primary" onClick={() => navigate('/create')} style={{ marginTop: '20px' }}>
          Go to Create
        </button>
      </div>
    );
  }

  // Drawing and Panning functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    if (activeTool === 'pan') {
      setDragStart({ x: clientX - panOffset.x, y: clientY - panOffset.y });
    } else {
      setIsDrawing(true);
      draw(e, true);
    }
  };

  const endDrawing = () => {
    setIsDrawing(false);
    setDragStart(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath(); // reset path
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, isStart = false) => {
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    if (activeTool === 'pan') {
      if (dragStart) {
        setPanOffset({
          x: clientX - dragStart.x,
          y: clientY - dragStart.y
        });
      }
      return;
    }

    if (!isDrawing && !isStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();

    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = selectedColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMouseMoveGlobal = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const templateImg = imgRef.current;
    if (!canvas || !templateImg) return;

    // Combine white bg + paint + template
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = dimensions.width;
    tempCanvas.height = dimensions.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(templateImg, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'my-masterpiece.png';
    a.click();
  };

  const handleSaveProgress = async () => {
    if (!user) {
      alert("Please login to save your progress.");
      navigate('/login');
      return;
    }
    if (!canvasRef.current || !result) return;
    
    setIsSaving(true);
    try {
      const canvasDataUrl = canvasRef.current.toDataURL('image/png');
      const paintingRecord = {
        id: activePaintingId || undefined,
        user_id: user.id,
        name: 'My Masterpiece',
        original_image_url: result.originalDataUrl,
        template_image_url: result.templateDataUrl,
        palette_image_url: result.paletteDataUrl,
        reference_image_url: result.referenceDataUrl || '',
        painted_canvas_url: '', // will be set in service
        palette_json: result.palette,
        metrics_json: result.metrics,
        completed: false,
        submitted: false,
      };

      const saved = await savePaintingProgress(paintingRecord, canvasDataUrl);
      setActivePaintingId(saved.id!);
      alert("Progress saved successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to save progress: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="paint-container">
      <div className="paint-bg-glow paint-bg-glow-1" />
      <div className="paint-bg-glow paint-bg-glow-2" />

      <div className="paint-workspace">
        {/* Toolbar */}
        <div className="paint-toolbar" style={{ paddingTop: '30px' }}>
          <div style={{ marginBottom: '30px' }}>
            <button 
              onClick={() => navigate(-1)} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '0', 
                border: 'none', 
                background: 'transparent', 
                cursor: 'pointer', 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          </div>

          <h3>Tools</h3>
          
          <div className="paint-tool-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {user && (
              <button className="paint-btn paint-btn-secondary" onClick={handleSaveProgress} disabled={isSaving} style={{ width: '100%' }}>
                {isSaving ? 'Saving...' : 'Save Progress'}
              </button>
            )}
            <button className="paint-btn paint-btn-primary" onClick={handleDownload} style={{ width: '100%' }}>
              Download
            </button>
          </div>
          
          <div className="paint-tool-section">
            <div className="paint-tool-buttons">
              <button 
                className={`paint-tool-btn ${activeTool === 'brush' ? 'active' : ''}`}
                onClick={() => setActiveTool('brush')}
              >
                Brush
              </button>
              <button 
                className={`paint-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
                onClick={() => setActiveTool('eraser')}
              >
                Eraser
              </button>
              <button 
                className={`paint-tool-btn ${activeTool === 'pan' ? 'active' : ''}`}
                onClick={() => setActiveTool('pan')}
              >
                Pan
              </button>
            </div>

            <label>Size: {brushSize}px</label>
            <div className="paint-slider-wrap">
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="paint-slider"
              />
            </div>
          </div>

          <div className="paint-tool-section">
            <label>Zoom</label>
            <div className="paint-zoom-controls">
              <button className="paint-zoom-btn" onClick={() => setZoom(z => Math.max(0.1, z - 0.2))}>-</button>
              <span className="paint-zoom-value">{Math.round(zoom * 100)}%</span>
              <button className="paint-zoom-btn" onClick={() => setZoom(z => Math.min(5, z + 0.2))}>+</button>
              <button className="paint-btn paint-btn-secondary" onClick={() => { setZoom(1); setPanOffset({x: 0, y: 0}); }} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Reset</button>
            </div>
          </div>

          <div className="paint-tool-section">
            <h3>Palette</h3>
            <div className="paint-palette-grid">
              {result.palette.map((c) => (
                <div 
                  key={c.index}
                  className={`paint-palette-swatch ${selectedColor === c.hex && activeTool === 'brush' ? 'active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => {
                    setSelectedColor(c.hex);
                    setActiveTool('brush');
                  }}
                  title={`Color ${c.index}: ${c.hex}`}
                >
                  <span className="paint-swatch-num">{c.index}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          className="paint-canvas-area"
          onMouseMove={handleMouseMoveGlobal}
          onMouseLeave={() => setMousePos(null)}
          onMouseEnter={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
          style={{
            backgroundImage: `linear-gradient(rgba(21, 21, 32, 0.85), rgba(21, 21, 32, 0.85)), url(${result.originalDataUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {mousePos && activeTool !== 'pan' && (
            <div 
              className="paint-cursor"
              style={{
                left: mousePos.x,
                top: mousePos.y,
                width: brushSize * zoom,
                height: brushSize * zoom
              }}
            />
          )}

          <div 
            className={`paint-canvas-container ${activeTool === 'pan' ? 'is-panning' : ''}`}
            style={{ 
              width: dimensions.width, 
              height: dimensions.height,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              zIndex: 1,
              cursor: activeTool === 'pan' ? (dragStart ? 'grabbing' : 'grab') : 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              className="paint-draw-canvas"
              width={dimensions.width}
              height={dimensions.height}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={endDrawing}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={endDrawing}
              onTouchCancel={endDrawing}
            />
            <img 
              ref={imgRef}
              src={result.templateDataUrl} 
              crossOrigin="anonymous"
              alt="Template Layer" 
              className="paint-template-img" 
              style={{ width: dimensions.width, height: dimensions.height }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaintPage;
