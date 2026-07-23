import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { supabase } from '../supabase/supabaseClient';
import './PaintingShowcase.css';

// Sample placeholder images (paint-by-numbers style)
const SAMPLE_IMAGES = [
  '/Sample1.jpg',
  '/Sample2.png',
  '/Sample3.avif',
  '/Sample4.avif',
];

interface PaintingShowcaseProps {
  /** Height of the showcase section */
  height?: string;
}

interface ShowcasePainting {
  id: string;
  url: string;
}

const PaintingShowcase: React.FC<PaintingShowcaseProps> = ({ height = '550px' }) => {
  const beltRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paintings, setPaintings] = useState<ShowcasePainting[]>([]);

  // Fetch recent community paintings
  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const { data, error } = await supabase
          .from('paintings')
          .select('id, original_image_url, painted_canvas_url, template_image_url')
          .eq('submitted', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (!error && data && data.length > 0) {
          const urls: ShowcasePainting[] = data.map((p: any) => ({
            id: p.id,
            url: p.painted_canvas_url || p.original_image_url || p.template_image_url,
          })).filter((p: ShowcasePainting) => p.url);
          setPaintings(urls);
        }
      } catch (err) {
        console.warn('Could not fetch showcase paintings, using samples');
      }
    };

    fetchPaintings();
  }, []);

  // Build the images array — use fetched paintings + samples as fallback
  const allImages: string[] = React.useMemo(() => {
    const images: string[] = [];

    // Add fetched paintings
    paintings.forEach(p => images.push(p.url));

    // Add sample images to fill up
    SAMPLE_IMAGES.forEach(s => images.push(s));

    // Repeat to fill at least 8 items per belt
    while (images.length < 8) {
      images.push(...SAMPLE_IMAGES);
    }

    return images;
  }, [paintings]);

  // Create belt contents — each belt shows the images in different order
  const beltImages = React.useMemo(() => {
    const belt1 = [...allImages];
    const belt2 = [...allImages].reverse();
    const belt3 = [...allImages.slice(2), ...allImages.slice(0, 2)];

    // Double each belt for seamless looping
    return [
      [...belt1, ...belt1],
      [...belt2, ...belt2],
      [...belt3, ...belt3],
    ];
  }, [allImages]);

  // Auto-scroll animation with GSAP
  useEffect(() => {
    const tweens: gsap.core.Tween[] = [];

    // Small delay so the DOM has rendered and widths are correct
    const timer = setTimeout(() => {
      beltRefs.current.forEach((belt, index) => {
        if (!belt) return;

        // Calculate single set width (half the belt since we doubled it)
        const singleWidth = belt.scrollWidth / 2;

        // Direction: top (R→L = negative), middle (L→R = positive), bottom (R→L)
        const goLeft = index % 2 === 0; // belts 0 and 2 go left, belt 1 goes right

        if (goLeft) {
          // Start at 0, scroll to -singleWidth, then jump back to 0
          gsap.set(belt, { x: 0 });
          const tween = gsap.to(belt, {
            x: -singleWidth,
            duration: 45 + index * 8,
            ease: 'none',
            repeat: -1,
          });
          tweens.push(tween);
        } else {
          // Start at -singleWidth, scroll to 0, then jump back
          gsap.set(belt, { x: -singleWidth });
          const tween = gsap.to(belt, {
            x: 0,
            duration: 45 + index * 8,
            ease: 'none',
            repeat: -1,
          });
          tweens.push(tween);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      tweens.forEach(t => t.kill());
    };
  }, [beltImages]);

  return (
    <div className="painting-showcase" style={{ height }}>
      <div className="painting-showcase-inner">
        {beltImages.map((belt, beltIndex) => (
          <div
            key={beltIndex}
            className="showcase-belt"
            ref={(el) => { beltRefs.current[beltIndex] = el; }}
          >
            {belt.map((imageUrl, imgIndex) => (
              <div key={`${beltIndex}-${imgIndex}`} className="showcase-card">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`Community painting ${imgIndex + 1}`}
                    loading="lazy"
                  />
                ) : (
                  <div className="showcase-card-placeholder">🎨</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaintingShowcase;
