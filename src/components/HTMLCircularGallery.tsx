import React, { useRef, useEffect, useState, ReactNode } from 'react';
import './HTMLCircularGallery.css';

interface HTMLCircularGalleryProps {
  bend?: number;
  startIndex?: number;
  children: ReactNode;
}

const HTMLCircularGallery: React.FC<HTMLCircularGalleryProps> = ({ bend = 3, startIndex = 0, children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setScrollProgress(containerRef.current.scrollLeft);
      }
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      
      // Initialize after a tiny delay to ensure layout is done
      setTimeout(() => {
        if (startIndex > 0 && startIndex < React.Children.count(children)) {
          const track = container.firstElementChild;
          if (track && track.children[startIndex]) {
            const child = track.children[startIndex] as HTMLElement;
            const childCenter = child.offsetLeft + child.offsetWidth / 2;
            container.scrollLeft = childCenter - container.clientWidth / 2;
          }
        }
        handleScroll();
      }, 50);

      window.addEventListener('resize', handleScroll);
    }
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftStart.current = containerRef.current.scrollLeft;
  };
  const onMouseLeave = () => { isDragging.current = false; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const scrollByAmount = (amount: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button 
        className="gallery-nav-button left" 
        onClick={() => scrollByAmount(-400)}
        aria-label="Scroll left"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div 
        className="html-circular-gallery-container" 
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
      >
        <div className="html-circular-gallery-track">
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return child;
            return (
              <GalleryItem key={index} containerRef={containerRef} bend={bend} scrollProgress={scrollProgress}>
                {child}
              </GalleryItem>
            );
          })}
        </div>
      </div>

      <button 
        className="gallery-nav-button right" 
        onClick={() => scrollByAmount(400)}
        aria-label="Scroll right"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  );
};

interface GalleryItemProps {
  children: ReactNode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  bend: number;
  scrollProgress: number;
}

const GalleryItem: React.FC<GalleryItemProps> = ({ children, containerRef, bend, scrollProgress }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('');

  useEffect(() => {
    if (!itemRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const item = itemRef.current;

    // We calculate X using element offsets relative to the scroll container to avoid feedback loops from transforms
    const scrollLeft = container.scrollLeft;
    
    // Calculate the item's center relative to the track
    const itemCenterRelative = item.offsetLeft + item.offsetWidth / 2;
    // Calculate the viewport's center relative to the track
    const containerCenterRelative = scrollLeft + container.clientWidth / 2;
    
    // x is the distance from the center of the item to the center of the container
    const x = itemCenterRelative - containerCenterRelative;

    const H = container.clientWidth / 2;
    // B_abs determines the max bend in pixels.
    const B_abs = Math.max(Math.abs(bend) * 40, 10); 
    
    let y = 0;
    let rotZ = 0;

    if (B_abs !== 0 && H > 0) {
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      
      y = bend > 0 ? -arc : arc;
      const angle = Math.asin(effectiveX / R);
      rotZ = bend > 0 
        ? -Math.sign(x) * angle
        : Math.sign(x) * angle;
    }

    // Convert rotZ from radians to degrees
    const rotZDeg = rotZ * (180 / Math.PI);

    setTransform(`translateY(${y}px) rotateZ(${rotZDeg}deg)`);
  }, [scrollProgress, bend, children]);

  return (
    <div className="html-circular-gallery-item" ref={itemRef} style={{ transform }}>
      {children}
    </div>
  );
};

export default HTMLCircularGallery;
