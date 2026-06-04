"""
classic_pipeline.py
-------------------
Classic algorithm-based pipeline (no ML).
Kept so the frontend can offer both modes side-by-side.
Uses: bilateral filter → SLIC superpixels → KMeans color quantization
"""

import io
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from sklearn.cluster import MiniBatchKMeans
from skimage.segmentation import slic
from skimage.color import rgb2lab, lab2rgb
from dataclasses import dataclass
from typing import Literal


@dataclass
class ClassicPBNConfig:
    n_colors: int = 12
    difficulty: Literal[1, 2, 3] = 2
    target_width: int = 900
    slic_segments: int = 800
    slic_compactness: float = 10.0


class ClassicPBNPipeline:

    def __init__(self, config: ClassicPBNConfig):
        self.cfg = config

    def load_image(self, data: bytes) -> np.ndarray:
        try:
            img_pil = Image.open(io.BytesIO(data)).convert("RGB")
            img = np.array(img_pil)
        except Exception as e:
            raise ValueError(f"Could not decode image. Details: {e}. Bytes received: {len(data)}")
            
        h, w = img.shape[:2]
        scale = self.cfg.target_width / w
        img = cv2.resize(img, (self.cfg.target_width, int(h * scale)), interpolation=cv2.INTER_LANCZOS4)
        return img

    def smooth(self, img: np.ndarray) -> np.ndarray:
        return cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

    def superpixels(self, img: np.ndarray) -> np.ndarray:
        return slic(img, n_segments=self.cfg.slic_segments, compactness=self.cfg.slic_compactness,
                    sigma=1, start_label=0, channel_axis=-1)

    def quantize_colors(self, img, segments):
        lab_img = rgb2lab(img.astype(np.float32) / 255.0)
        n_seg = segments.max() + 1
        seg_colors = np.zeros((n_seg, 3))
        seg_counts = np.zeros(n_seg, dtype=np.int32)
        for sid in range(n_seg):
            mask = segments == sid
            if mask.any():
                seg_colors[sid] = lab_img[mask].mean(axis=0)
                seg_counts[sid] = mask.sum()
        k = min(self.cfg.n_colors, n_seg)
        km = MiniBatchKMeans(n_clusters=k, init="k-means++", n_init=5, random_state=42)
        sp_labels = km.fit_predict(seg_colors, sample_weight=seg_counts / seg_counts.sum())
        centers_lab = km.cluster_centers_
        label_map = sp_labels[segments]
        centers_rgb = (np.clip(lab2rgb(centers_lab[np.newaxis])[0], 0, 1) * 255).astype(np.uint8)
        palette = [{"index": i+1, "hex": "#{:02x}{:02x}{:02x}".format(*centers_rgb[i].tolist()),
                    "rgb": centers_rgb[i].tolist()} for i in range(k)]
        return label_map, centers_rgb, palette

    def merge_small(self, label_map):
        h, w = label_map.shape
        min_frac = {1: 0.0010, 2: 0.0005, 3: 0.0002}[self.cfg.difficulty]
        min_px = max(int(h * w * min_frac), 30)
        refined = label_map.copy()
        k = int(refined.max()) + 1
        for lbl in range(k):
            mask = (refined == lbl).astype(np.uint8)
            n_comp, comp_map, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for cid in range(1, n_comp):
                if stats[cid, cv2.CC_STAT_AREA] >= min_px:
                    continue
                cm = (comp_map == cid).astype(np.uint8)
                dilated = cv2.dilate(cm, np.ones((3,3), np.uint8))
                neighbors = refined[(dilated - cm).astype(bool)]
                neighbors = neighbors[neighbors != lbl]
                if len(neighbors):
                    refined[comp_map == cid] = int(np.bincount(neighbors).argmax())
        return refined

    def detect_edges(self, label_map):
        h, w = label_map.shape
        edges = np.zeros((h, w), dtype=np.uint8)
        edges[1:] |= (label_map[1:] != label_map[:-1]).astype(np.uint8)
        edges[:, 1:] |= (label_map[:, 1:] != label_map[:, :-1]).astype(np.uint8)
        return edges * 255

    def place_numbers(self, template, label_map):
        out = Image.fromarray(template)
        draw = ImageDraw.Draw(out)
        k = int(label_map.max()) + 1

        def get_font(size):
            for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                      "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
                if os.path.exists(p):
                    return ImageFont.truetype(p, size)
            return ImageFont.load_default()

        for lbl in range(k):
            mask = (label_map == lbl).astype(np.uint8)
            n, comp_map, stats, centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for cid in range(1, n):
                bw, bh = stats[cid, cv2.CC_STAT_WIDTH], stats[cid, cv2.CC_STAT_HEIGHT]
                d = max(bw, bh)
                if d < 14:
                    continue
                cx, cy = int(centroids[cid][0]), int(centroids[cid][1])
                if comp_map[cy, cx] != cid:
                    ys, xs = np.where(comp_map == cid)
                    idx = np.argmin((xs-cx)**2 + (ys-cy)**2)
                    cx, cy = int(xs[idx]), int(ys[idx])
                fs = 8 if d<30 else 11 if d<60 else 14 if d<120 else 18 if d<240 else 22
                font = get_font(fs)
                text = str(lbl + 1)
                bb = draw.textbbox((0,0), text, font=font)
                tx, ty = cx-(bb[2]-bb[0])//2, cy-(bb[3]-bb[1])//2
                for ox, oy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)]:
                    draw.text((tx+ox, ty+oy), text, fill=(255,255,255), font=font)
                draw.text((tx, ty), text, fill=(55,55,55), font=font)
        return np.array(out)

    def render_template(self, label_map):
        h, w = label_map.shape
        t = np.full((h, w, 3), 255, dtype=np.uint8)
        t[self.detect_edges(label_map) == 255] = [190, 190, 190]
        return t

    def render_reference(self, label_map, centers_rgb):
        return centers_rgb[label_map].astype(np.uint8)

    def render_palette(self, palette, centers_rgb):
        k = len(palette)
        cols = min(k, 10)
        rows = (k + cols - 1) // cols
        bw, bh = 110, 130
        img = Image.new("RGB", (cols*bw, rows*bh), (20,20,35))
        draw = ImageDraw.Draw(img)
        def get_font(size, bold=True):
            for p in [f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf"]:
                if os.path.exists(p):
                    return ImageFont.truetype(p, size)
            return ImageFont.load_default()
        fn, fh = get_font(20), get_font(11, False)
        for i, p in enumerate(palette):
            col, row = i % cols, i // cols
            x, y = col*bw, row*bh
            r, g, b = p["rgb"]
            m, sw, sh = 8, bw-16, bh-38
            draw.rounded_rectangle([x+m, y+m, x+m+sw, y+m+sh], radius=8, fill=(r,g,b))
            tc = (0,0,0) if 0.299*r+0.587*g+0.114*b > 128 else (255,255,255)
            draw.text((x+bw//2, y+m+sh//2), str(i+1), fill=tc, font=fn, anchor="mm")
            draw.text((x+bw//2, y+bh-10), p["hex"], fill=(160,160,160), font=fh, anchor="mm")
        return np.array(img)

    def compute_metrics(self, label_map):
        k = int(label_map.max()) + 1
        sizes = []
        for lbl in range(k):
            mask = (label_map == lbl).astype(np.uint8)
            n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for i in range(1, n):
                sizes.append(int(stats[i, cv2.CC_STAT_AREA]))
        return {
            "total_regions": len(sizes),
            "avg_region_size": int(np.mean(sizes)) if sizes else 0,
            "smallest_region": int(np.min(sizes)) if sizes else 0,
            "largest_region": int(np.max(sizes)) if sizes else 0,
            "color_count": k,
        }

    def run(self, image_bytes: bytes) -> dict:
        def to_png(arr):
            buf = io.BytesIO()
            Image.fromarray(arr).save(buf, format="PNG", optimize=True)
            return buf.getvalue()

        img = self.load_image(image_bytes)
        smoothed = self.smooth(img)
        segments = self.superpixels(smoothed)
        label_map, centers_rgb, palette = self.quantize_colors(smoothed, segments)
        label_map = self.merge_small(label_map)
        template = self.render_template(label_map)
        numbered = self.place_numbers(template, label_map)

        return {
            "template": to_png(numbered),
            "reference": to_png(self.render_reference(label_map, centers_rgb)),
            "palette": to_png(self.render_palette(palette, centers_rgb)),
            "original": to_png(img),
            "palette_data": palette,
            "metrics": self.compute_metrics(label_map),
        }
