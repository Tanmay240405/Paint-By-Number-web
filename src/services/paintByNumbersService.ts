// Paint-By-Numbers Generator - Ported from Python/OpenCV to TypeScript/Canvas
// Uses KMeans clustering, edge-preserving smoothing, contour detection, and smart number placement

// ─── Color Space Conversion ─────────────────────────────────────────

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  c = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, c * 255)));
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // RGB -> XYZ (D65)
  let lr = srgbToLinear(r);
  let lg = srgbToLinear(g);
  let lb = srgbToLinear(b);

  let x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  let y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  let z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;

  // XYZ -> LAB (D65 reference)
  x /= 0.95047;
  y /= 1.0;
  z /= 1.08883;

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x), fy = f(y), fz = f(z);

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [L, a, bVal];
}

function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const invF = (t: number) => t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787;
  let x = 0.95047 * invF(fx);
  let y = 1.0 * invF(fy);
  let z = 1.08883 * invF(fz);

  // XYZ -> RGB
  let lr = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  let lg = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  let lb = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// ─── KMeans Clustering ──────────────────────────────────────────────

function kMeansClustering(
  pixels: Float32Array, // flat [L,a,b, L,a,b, ...]
  k: number,
  maxIter: number = 20
): { labels: Int32Array; centers: Float32Array } {
  const n = pixels.length / 3;

  // Initialize centers using k-means++ like strategy
  const centers = new Float32Array(k * 3);
  const usedIndices = new Set<number>();

  // First center random
  let idx = Math.floor(Math.random() * n);
  usedIndices.add(idx);
  centers[0] = pixels[idx * 3];
  centers[1] = pixels[idx * 3 + 1];
  centers[2] = pixels[idx * 3 + 2];

  // Remaining centers: pick pixels furthest from existing centers
  for (let c = 1; c < k; c++) {
    let bestDist = -1;
    let bestIdx = 0;
    // Sample randomly for speed
    const sampleCount = Math.min(1000, n);
    for (let s = 0; s < sampleCount; s++) {
      const si = Math.floor(Math.random() * n);
      if (usedIndices.has(si)) continue;
      let minDist = Infinity;
      for (let cc = 0; cc < c; cc++) {
        const dL = pixels[si * 3] - centers[cc * 3];
        const da = pixels[si * 3 + 1] - centers[cc * 3 + 1];
        const db = pixels[si * 3 + 2] - centers[cc * 3 + 2];
        const dist = dL * dL + da * da + db * db;
        if (dist < minDist) minDist = dist;
      }
      if (minDist > bestDist) {
        bestDist = minDist;
        bestIdx = si;
      }
    }
    usedIndices.add(bestIdx);
    centers[c * 3] = pixels[bestIdx * 3];
    centers[c * 3 + 1] = pixels[bestIdx * 3 + 1];
    centers[c * 3 + 2] = pixels[bestIdx * 3 + 2];
  }

  const labels = new Int32Array(n);
  const counts = new Int32Array(k);
  const sums = new Float32Array(k * 3);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    counts.fill(0);
    sums.fill(0);

    for (let i = 0; i < n; i++) {
      const pL = pixels[i * 3];
      const pa = pixels[i * 3 + 1];
      const pb = pixels[i * 3 + 2];
      let bestDist = Infinity;
      let bestLabel = 0;

      for (let c = 0; c < k; c++) {
        const dL = pL - centers[c * 3];
        const da = pa - centers[c * 3 + 1];
        const db = pb - centers[c * 3 + 2];
        const dist = dL * dL + da * da + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestLabel = c;
        }
      }
      labels[i] = bestLabel;
      counts[bestLabel]++;
      sums[bestLabel * 3] += pL;
      sums[bestLabel * 3 + 1] += pa;
      sums[bestLabel * 3 + 2] += pb;
    }

    // Update step
    let converged = true;
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      const newL = sums[c * 3] / counts[c];
      const newA = sums[c * 3 + 1] / counts[c];
      const newB = sums[c * 3 + 2] / counts[c];

      if (Math.abs(newL - centers[c * 3]) > 0.1 ||
          Math.abs(newA - centers[c * 3 + 1]) > 0.1 ||
          Math.abs(newB - centers[c * 3 + 2]) > 0.1) {
        converged = false;
      }
      centers[c * 3] = newL;
      centers[c * 3 + 1] = newA;
      centers[c * 3 + 2] = newB;
    }
    if (converged) break;
  }

  return { labels, centers };
}

// ─── Simple Box Blur (used as fast bilateral approximation) ─────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function boxBlur(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const size = radius * 2 + 1;
  const area = size * size;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0, gSum = 0, bSum = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.max(0, Math.min(w - 1, x + dx));
          const sy = Math.max(0, Math.min(h - 1, y + dy));
          const idx = (sy * w + sx) * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
        }
      }
      const oi = (y * w + x) * 4;
      out[oi] = rSum / area;
      out[oi + 1] = gSum / area;
      out[oi + 2] = bSum / area;
      out[oi + 3] = 255;
    }
  }
  return out;
}

// ─── Edge-Preserving Smooth (simplified bilateral) ──────────────────

function edgePreservingSmooth(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number = 5,
  sigmaColor: number = 60
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const sigmaColor2 = 2 * sigmaColor * sigmaColor;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ci = (y * w + x) * 4;
      const cR = data[ci], cG = data[ci + 1], cB = data[ci + 2];
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const sx = Math.max(0, Math.min(w - 1, x + dx));
          const sy = Math.max(0, Math.min(h - 1, y + dy));
          const si = (sy * w + sx) * 4;
          const nR = data[si], nG = data[si + 1], nB = data[si + 2];

          const colorDiff = (nR - cR) ** 2 + (nG - cG) ** 2 + (nB - cB) ** 2;
          const weight = Math.exp(-colorDiff / sigmaColor2);

          rSum += nR * weight;
          gSum += nG * weight;
          bSum += nB * weight;
          wSum += weight;
        }
      }

      out[ci] = rSum / wSum;
      out[ci + 1] = gSum / wSum;
      out[ci + 2] = bSum / wSum;
      out[ci + 3] = 255;
    }
  }
  return out;
}

// ─── Flood Fill for Connected Components ────────────────────────────

function connectedComponents(
  labels: Int32Array,
  w: number,
  h: number,
  targetLabel: number
): { componentMap: Int32Array; componentSizes: number[]; count: number } {
  const componentMap = new Int32Array(w * h).fill(-1);
  const componentSizes: number[] = [];
  let count = 0;

  const stack: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (labels[idx] !== targetLabel || componentMap[idx] !== -1) continue;

      // BFS flood fill
      const compId = count++;
      let size = 0;
      stack.push(idx);
      componentMap[idx] = compId;

      while (stack.length > 0) {
        const ci = stack.pop()!;
        size++;
        const cx = ci % w;
        const cy = (ci - cx) / w;

        // 8-connectivity neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = ny * w + nx;
            if (labels[ni] === targetLabel && componentMap[ni] === -1) {
              componentMap[ni] = compId;
              stack.push(ni);
            }
          }
        }
      }
      componentSizes.push(size);
    }
  }

  return { componentMap, componentSizes, count };
}

// ─── Merge Small Regions ────────────────────────────────────────────

function mergeSmallRegions(
  labels: Int32Array, labPixels: Float32Array,
  w: number, h: number, minSize: number, nColors: number
): Int32Array {
  const refined = new Int32Array(labels);

  // Compute average LAB color per label
  const labelColorSums = new Float32Array(nColors * 3);
  const labelCounts = new Int32Array(nColors);
  for (let i = 0; i < labels.length; i++) {
    const lbl = labels[i];
    labelColorSums[lbl * 3] += labPixels[i * 3];
    labelColorSums[lbl * 3 + 1] += labPixels[i * 3 + 1];
    labelColorSums[lbl * 3 + 2] += labPixels[i * 3 + 2];
    labelCounts[lbl]++;
  }

  const labelColors: number[][] = [];
  for (let i = 0; i < nColors; i++) {
    if (labelCounts[i] > 0) {
      labelColors.push([
        labelColorSums[i * 3] / labelCounts[i],
        labelColorSums[i * 3 + 1] / labelCounts[i],
        labelColorSums[i * 3 + 2] / labelCounts[i],
      ]);
    } else {
      labelColors.push([0, 0, 0]);
    }
  }

  for (let lbl = 0; lbl < nColors; lbl++) {
    const { componentMap, componentSizes, count } = connectedComponents(refined, w, h, lbl);
    if (count === 0) continue;

    for (let compId = 0; compId < count; compId++) {
      if (componentSizes[compId] >= minSize) continue;

      // Find pixels of this small component and their neighbors
      const neighborCounts = new Map<number, number>();

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (refined[idx] !== lbl || componentMap[idx] !== compId) continue;

          // Check neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
              const ni = ny * w + nx;
              if (refined[ni] !== lbl) {
                neighborCounts.set(refined[ni], (neighborCounts.get(refined[ni]) || 0) + 1);
              }
            }
          }
        }
      }

      // Find most similar neighbor color
      let bestNeighbor = lbl;
      let minDist = Infinity;
      const curColor = labelColors[lbl];

      const neighborEntries = Array.from(neighborCounts.entries());
      for (let ni = 0; ni < neighborEntries.length; ni++) {
        const nLbl = neighborEntries[ni][0];
        const nColor = labelColors[nLbl];
        const dist = (curColor[0] - nColor[0]) ** 2 +
                     (curColor[1] - nColor[1]) ** 2 +
                     (curColor[2] - nColor[2]) ** 2;
        if (dist < minDist) {
          minDist = dist;
          bestNeighbor = nLbl;
        }
      }

      // Re-assign pixels
      if (bestNeighbor !== lbl) {
        for (let i = 0; i < w * h; i++) {
          if (refined[i] === lbl && componentMap[i] === compId) {
            refined[i] = bestNeighbor;
          }
        }
      }
    }
  }

  return refined;
}

// ─── Contour Tracing ────────────────────────────────────────────────

function findContourPixels(
  labels: Int32Array, w: number, h: number
): Uint8Array {
  // A pixel is a contour pixel if any of its 4-neighbors has a different label
  const contour = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const lbl = labels[idx];
      if (
        (x > 0 && labels[idx - 1] !== lbl) ||
        (x < w - 1 && labels[idx + 1] !== lbl) ||
        (y > 0 && labels[(y - 1) * w + x] !== lbl) ||
        (y < h - 1 && labels[(y + 1) * w + x] !== lbl)
      ) {
        contour[idx] = 1;
      }
    }
  }
  return contour;
}

// ─── Region Centroid + Size Computation ─────────────────────────────

interface RegionInfo {
  label: number;
  compId: number;
  cx: number;
  cy: number;
  size: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeRegions(
  labels: Int32Array, w: number, h: number, nColors: number
): RegionInfo[] {
  const regions: RegionInfo[] = [];

  for (let lbl = 0; lbl < nColors; lbl++) {
    const { componentMap, componentSizes, count } = connectedComponents(labels, w, h, lbl);
    for (let compId = 0; compId < count; compId++) {
      let sumX = 0, sumY = 0;
      let minX = w, minY = h, maxX = 0, maxY = 0;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (labels[idx] === lbl && componentMap[idx] === compId) {
            sumX += x;
            sumY += y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      const size = componentSizes[compId];
      regions.push({
        label: lbl,
        compId,
        cx: Math.round(sumX / size),
        cy: Math.round(sumY / size),
        size,
        minX, minY, maxX, maxY,
      });
    }
  }

  return regions;
}

// ─── RGB to Hex ─────────────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

// ─── Main Generator Types ───────────────────────────────────────────

export interface PBNOptions {
  nColors: number;       // 8-20
  difficulty: 1 | 2 | 3;
  targetWidth?: number;  // default 800 for web display
}

export interface PBNResult {
  templateDataUrl: string;
  paletteDataUrl: string;
  referenceDataUrl: string;
  originalDataUrl: string;
  metrics: {
    totalRegions: number;
    avgRegionSize: number;
    smallestRegion: number;
    largestRegion: number;
  };
  palette: { index: number; hex: string; rgb: [number, number, number] }[];
}

// ─── Main Generator Function ────────────────────────────────────────

export async function generatePaintByNumbers(
  imageFile: File,
  options: PBNOptions,
  onProgress?: (stage: string, percent: number) => void
): Promise<PBNResult> {
  const { nColors, difficulty, targetWidth = 800 } = options;

  const progress = (stage: string, percent: number) => {
    onProgress?.(stage, percent);
  };

  // 1. Load image
  progress('Loading image...', 5);
  const img = await loadImageFile(imageFile);

  // 2. Resize
  progress('Resizing image...', 10);
  const scale = targetWidth / img.width;
  const newW = Math.round(img.width * scale);
  const newH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, newW, newH);

  // Save original
  const originalDataUrl = canvas.toDataURL('image/png');

  let imageData = ctx.getImageData(0, 0, newW, newH);
  const w = newW, h = newH;

  // 3. Edge-preserving smooth
  progress('Smoothing image...', 15);
  await yieldToUI();
  const smoothRadius = 3;
  const smoothedPixels = edgePreservingSmooth(imageData.data, w, h, smoothRadius, 60);

  // 4. Convert to LAB and cluster
  progress('Extracting color palette...', 25);
  await yieldToUI();
  const totalPixels = w * h;
  const labPixels = new Float32Array(totalPixels * 3);

  for (let i = 0; i < totalPixels; i++) {
    const [L, a, b] = rgbToLab(
      smoothedPixels[i * 4],
      smoothedPixels[i * 4 + 1],
      smoothedPixels[i * 4 + 2]
    );
    labPixels[i * 3] = L;
    labPixels[i * 3 + 1] = a;
    labPixels[i * 3 + 2] = b;
  }

  // Sample for faster clustering
  progress('Clustering colors...', 35);
  await yieldToUI();
  const sampleSize = Math.min(totalPixels, 8000);
  const samplePixels = new Float32Array(sampleSize * 3);
  for (let i = 0; i < sampleSize; i++) {
    const si = Math.floor(Math.random() * totalPixels);
    samplePixels[i * 3] = labPixels[si * 3];
    samplePixels[i * 3 + 1] = labPixels[si * 3 + 1];
    samplePixels[i * 3 + 2] = labPixels[si * 3 + 2];
  }

  const { centers } = kMeansClustering(samplePixels, nColors, 25);

  // Assign all pixels to nearest center
  progress('Assigning colors...', 50);
  await yieldToUI();
  const labels = new Int32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    let bestDist = Infinity;
    let bestLabel = 0;
    const pL = labPixels[i * 3];
    const pa = labPixels[i * 3 + 1];
    const pb = labPixels[i * 3 + 2];

    for (let c = 0; c < nColors; c++) {
      const dL = pL - centers[c * 3];
      const da = pa - centers[c * 3 + 1];
      const db = pb - centers[c * 3 + 2];
      const dist = dL * dL + da * da + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = c;
      }
    }
    labels[i] = bestLabel;
  }

  // Convert centers to RGB
  const centersRgb: [number, number, number][] = [];
  for (let c = 0; c < nColors; c++) {
    centersRgb.push(labToRgb(centers[c * 3], centers[c * 3 + 1], centers[c * 3 + 2]));
  }

  // 5. Merge small regions
  progress('Optimizing regions...', 60);
  await yieldToUI();
  let minPx: number;
  if (difficulty === 1) {
    minPx = Math.floor(w * h * 0.0008);
  } else if (difficulty === 3) {
    minPx = Math.floor(w * h * 0.0002);
  } else {
    minPx = Math.floor(w * h * 0.0004);
  }

  const cleanedLabels = mergeSmallRegions(labels, labPixels, w, h, Math.max(minPx, 20), nColors);

  // 6. Compute regions and metrics
  progress('Analyzing regions...', 70);
  await yieldToUI();
  const regions = computeRegions(cleanedLabels, w, h, nColors);

  const regionSizes = regions.map(r => r.size);
  const metrics = {
    totalRegions: regions.length,
    avgRegionSize: Math.round(regionSizes.reduce((a, b) => a + b, 0) / regionSizes.length),
    smallestRegion: Math.min(...regionSizes),
    largestRegion: Math.max(...regionSizes),
  };

  // 7. Generate template image
  progress('Drawing template...', 80);
  await yieldToUI();
  const templateDataUrl = drawTemplate(cleanedLabels, regions, centersRgb, w, h, nColors);

  // 8. Generate palette image
  progress('Creating palette...', 90);
  await yieldToUI();
  const palette = centersRgb.map((rgb, i) => ({
    index: i + 1,
    hex: rgbToHex(rgb[0], rgb[1], rgb[2]),
    rgb: rgb as [number, number, number],
  }));
  const paletteDataUrl = drawPalette(centersRgb, nColors);

  // 9. Generate colored reference
  progress('Creating reference...', 95);
  await yieldToUI();
  const referenceDataUrl = drawColoredReference(cleanedLabels, centersRgb, w, h);

  progress('Complete!', 100);

  return {
    templateDataUrl,
    paletteDataUrl,
    referenceDataUrl,
    originalDataUrl,
    metrics,
    palette,
  };
}

// ─── Drawing Functions ──────────────────────────────────────────────

function drawTemplate(
  labels: Int32Array, regions: RegionInfo[],
  centersRgb: [number, number, number][],
  w: number, h: number, nColors: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Draw contour lines
  const contour = findContourPixels(labels, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    if (contour[i]) {
      imgData.data[i * 4] = 140;
      imgData.data[i * 4 + 1] = 140;
      imgData.data[i * 4 + 2] = 140;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Place numbers in regions
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const region of regions) {
    const diameter = Math.max(region.maxX - region.minX, region.maxY - region.minY);

    if (diameter < 15) continue; // Skip very tiny regions

    // Adaptive font sizing
    let fontSize: number;
    if (diameter < 30) {
      fontSize = 7;
    } else if (diameter < 50) {
      fontSize = 9;
    } else if (diameter < 100) {
      fontSize = 12;
    } else if (diameter < 200) {
      fontSize = 16;
    } else {
      fontSize = 20;
    }

    const text = String(region.label + 1);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;

    // White halo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeText(text, region.cx, region.cy);

    // Number text
    ctx.fillStyle = '#505050';
    ctx.fillText(text, region.cx, region.cy);
  }

  return canvas.toDataURL('image/png');
}

function drawPalette(
  centersRgb: [number, number, number][],
  nColors: number
): string {
  const blockW = 100;
  const blockH = 120;
  const cols = Math.min(nColors, 10);
  const rows = Math.ceil(nColors / cols);
  const canvasW = cols * blockW;
  const canvasH = rows * blockH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasW, canvasH);

  for (let i = 0; i < nColors; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * blockW;
    const y = row * blockH;
    const [r, g, b] = centersRgb[i];

    // Color swatch
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    const swatchMargin = 8;
    const swatchH = blockH - 36;
    ctx.beginPath();
    ctx.roundRect(x + swatchMargin, y + swatchMargin, blockW - swatchMargin * 2, swatchH, 8);
    ctx.fill();

    // Number on swatch
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    ctx.fillStyle = luminance > 128 ? '#000000' : '#ffffff';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + blockW / 2, y + swatchMargin + swatchH / 2);

    // Hex label
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px monospace';
    ctx.fillText(rgbToHex(r, g, b), x + blockW / 2, y + blockH - 10);
  }

  return canvas.toDataURL('image/png');
}

function drawColoredReference(
  labels: Int32Array,
  centersRgb: [number, number, number][],
  w: number, h: number
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const lbl = labels[i];
    const [r, g, b] = centersRgb[lbl];
    imgData.data[i * 4] = r;
    imgData.data[i * 4 + 1] = g;
    imgData.data[i * 4 + 2] = b;
    imgData.data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

// ─── Helpers ────────────────────────────────────────────────────────

function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function yieldToUI(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
