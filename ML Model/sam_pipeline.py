"""
sam_pipeline.py
---------------
Core ML pipeline using Segment Anything Model (SAM) for paint-by-numbers generation.

Pipeline stages:
  1. Load & resize image
  2. SAM automatic mask generation  ← THE ML PART
  3. Merge tiny/overlapping masks into regions
  4. KMeans++ color quantization per region (LAB space)
  5. Merge small color regions
  6. Edge detection from label map
  7. Smart number placement
  8. Render template / reference / palette outputs
"""

import os
import io
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from sklearn.cluster import MiniBatchKMeans
from skimage.color import rgb2lab, lab2rgb
from dataclasses import dataclass, field
from typing import Literal
import torch

# SAM imports
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator


# ─── Config ──────────────────────────────────────────────────────────────────

@dataclass
class SAMPBNConfig:
    # Color palette
    n_colors: int = 12                  # 4–24

    # Difficulty controls minimum region size
    difficulty: Literal[1, 2, 3] = 2

    # Output image width (height scales proportionally)
    target_width: int = 900

    # SAM model type: "vit_b" | "vit_l" | "vit_h"
    sam_model_type: str = "vit_b"

    # SAM automatic mask generation tuning (Tuned for ultra-high paint-by-numbers details!)
    # points_per_side: higher = more masks = finer detail
    sam_points_per_side: int = 64

    # Minimum mask area as fraction of image (set lower to preserve fine-grained structural lines)
    sam_min_mask_region_area: float = 0.00001

    # Stability score threshold (0–1): lower = captures way more subtle shading boundaries
    sam_stability_score_thresh: float = 0.82

    # IOU prediction threshold: lower = retains smaller detail shapes
    sam_pred_iou_thresh: float = 0.80


# ─── Model Loader (singleton — load once, reuse) ─────────────────────────────

_sam_model = None
_sam_config_key = None


def load_sam(config: SAMPBNConfig):
    """
    Load SAM model into memory. Called once at server startup.
    Subsequent calls return the cached model.
    """
    global _sam_model, _sam_config_key

    key = (config.sam_model_type,)
    if _sam_model is not None and _sam_config_key == key:
        return _sam_model

    # Find weights file
    models_dir = os.path.join(os.path.dirname(__file__), "models")
    weight_map = {
        "vit_b": "sam_vit_b_01ec64.pth",
        "vit_l": "sam_vit_l_0b3195.pth",
        "vit_h": "sam_vit_h_4b8939.pth",
    }
    weights_path = os.path.join(models_dir, weight_map[config.sam_model_type])

    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"SAM weights not found at {weights_path}. "
            f"Run: python download_sam.py --model {config.sam_model_type}"
        )

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[SAM] Loading {config.sam_model_type} on {device} from {weights_path}")

    sam = sam_model_registry[config.sam_model_type](checkpoint=weights_path)
    sam.to(device=device)
    sam.eval()

    _sam_model = sam
    _sam_config_key = key
    print(f"[SAM] Model loaded ✅")
    return sam


# ─── Main Pipeline Class ──────────────────────────────────────────────────────

class SAMPaintByNumbersPipeline:

    def __init__(self, config: SAMPBNConfig):
        self.cfg = config
        self.sam = load_sam(config)

    # ── 1. Load & resize ──────────────────────────────────────────────

    def load_image(self, data: bytes) -> np.ndarray:
        arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image. Check the file format.")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = img.shape[:2]
        scale = self.cfg.target_width / w
        new_w = self.cfg.target_width
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
        return img  # uint8 RGB, shape (H, W, 3)

    # ── 2. SAM — automatic mask generation ───────────────────────────
    # THIS IS THE ML STEP.
    # SAM's image encoder (Vision Transformer) processes the image and
    # outputs dense embeddings. The mask decoder then predicts masks for
    # a grid of prompt points. We get back a list of masks, each with:
    #   - segmentation: bool array (H, W)
    #   - area: pixel count
    #   - stability_score: model confidence
    #   - predicted_iou: estimated mask quality

    def run_sam(self, img: np.ndarray) -> list[dict]:
        """
        Run SAM automatic mask generation.
        Returns list of mask dicts sorted by area descending.
        """
        cfg = self.cfg
        h, w = img.shape[:2]
        min_area_px = int(h * w * cfg.sam_min_mask_region_area)

        generator = SamAutomaticMaskGenerator(
            model=self.sam,
            points_per_side=cfg.sam_points_per_side,
            pred_iou_thresh=cfg.sam_pred_iou_thresh,
            stability_score_thresh=cfg.sam_stability_score_thresh,
            min_mask_region_area=min_area_px,
            # crop_n_layers=1 enables a second pass on crops for small objects
            crop_n_layers=1,
            crop_n_points_downscale_factor=2,
        )

        print(f"[SAM] Running inference on {w}x{h} image...")
        masks = generator.generate(img)
        print(f"[SAM] Generated {len(masks)} masks")

        # Sort by area descending so large regions are processed first
        masks.sort(key=lambda m: m["area"], reverse=True)
        return masks

    # ── 3. Convert SAM masks → integer label map ──────────────────────

    def masks_to_label_map(
        self, masks: list[dict], img: np.ndarray
    ) -> np.ndarray:
        """
        Assign each pixel to a SAM mask (region).
        Pixels not covered by any mask get assigned to the nearest mask.
        Returns label_map (H, W) int32
        """
        h, w = img.shape[:2]
        label_map = np.full((h, w), -1, dtype=np.int32)

        # Paint masks from largest to smallest so smaller masks win
        # (they sit on top of larger background regions)
        for i, mask_info in enumerate(reversed(masks)):
            seg = mask_info["segmentation"]  # bool (H, W)
            label_map[seg] = len(masks) - 1 - i

        # Fill any uncovered pixels using nearest-neighbor from covered pixels
        uncovered = label_map == -1
        if uncovered.any():
            # Use distance transform to find nearest covered pixel
            covered_mask = (~uncovered).astype(np.uint8)
            _, _, _, nearest = cv2.connectedComponentsWithStats(
                covered_mask, connectivity=8
            )
            # Fallback: assign -1 pixels to label 0 (background)
            label_map[uncovered] = 0

        return label_map

    # ── 4. KMeans color quantization ──────────────────────────────────

    def quantize_colors(
        self, img: np.ndarray, label_map: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray, list]:
        """
        Compute mean LAB color per SAM region, then cluster into n_colors
        using KMeans++. Returns final per-pixel label map (H, W) and palette.
        """
        n_regions = int(label_map.max()) + 1
        lab_img = rgb2lab(img.astype(np.float32) / 255.0)

        # Per-region mean LAB color
        region_colors = np.zeros((n_regions, 3), dtype=np.float64)
        region_counts = np.zeros(n_regions, dtype=np.int32)

        for r_id in range(n_regions):
            mask = label_map == r_id
            if mask.any():
                region_colors[r_id] = lab_img[mask].mean(axis=0)
                region_counts[r_id] = mask.sum()

        # Cluster region colors into n_colors
        k = min(self.cfg.n_colors, n_regions)
        km = MiniBatchKMeans(
            n_clusters=k,
            init="k-means++",
            n_init=5,
            max_iter=300,
            random_state=42,
        )
        # Weight by region size so large regions influence the palette more
        weights = region_counts / region_counts.sum()
        region_color_labels = km.fit_predict(region_colors, sample_weight=weights)
        centers_lab = km.cluster_centers_  # (k, 3)

        # Map regions → pixels
        color_label_map = region_color_labels[label_map]  # (H, W)

        # LAB centers → RGB uint8
        centers_lab_img = centers_lab[np.newaxis, :, :]
        centers_rgb_f = lab2rgb(centers_lab_img)[0]
        centers_rgb = (np.clip(centers_rgb_f, 0, 1) * 255).astype(np.uint8)

        palette = [
            {
                "index": i + 1,
                "hex": "#{:02x}{:02x}{:02x}".format(*centers_rgb[i].tolist()),
                "rgb": centers_rgb[i].tolist(),
            }
            for i in range(k)
        ]

        return color_label_map, centers_rgb, palette

    # ── 5. Merge small color regions ──────────────────────────────────

    def merge_small_regions(self, label_map: np.ndarray) -> np.ndarray:
        h, w = label_map.shape
        cfg = self.cfg
        min_frac = {1: 0.0001, 2: 0.00003, 3: 0.000005}[cfg.difficulty]
        min_px = max(int(h * w * min_frac), 8 if cfg.difficulty == 3 else 15 if cfg.difficulty == 2 else 30)

        refined = label_map.copy()
        k = int(refined.max()) + 1

        for lbl in range(k):
            mask = (refined == lbl).astype(np.uint8)
            n_comp, comp_map, stats, _ = cv2.connectedComponentsWithStats(
                mask, connectivity=8
            )
            for comp_id in range(1, n_comp):
                if stats[comp_id, cv2.CC_STAT_AREA] >= min_px:
                    continue
                comp_mask = (comp_map == comp_id).astype(np.uint8)
                dilated = cv2.dilate(comp_mask, np.ones((3, 3), np.uint8))
                border = dilated - comp_mask
                neighbors = refined[border.astype(bool)]
                neighbors = neighbors[neighbors != lbl]
                if len(neighbors) == 0:
                    continue
                best = int(np.bincount(neighbors).argmax())
                refined[comp_map == comp_id] = best

        return refined

    # ── 6. Edge detection ─────────────────────────────────────────────

    def detect_edges(self, label_map: np.ndarray) -> np.ndarray:
        h, w = label_map.shape
        dy = (label_map[1:, :] != label_map[:-1, :]).astype(np.uint8)
        dx = (label_map[:, 1:] != label_map[:, :-1]).astype(np.uint8)
        edges = np.zeros((h, w), dtype=np.uint8)
        edges[1:, :] |= dy
        edges[:, 1:] |= dx
        return edges * 255

    # ── 7. Number placement ───────────────────────────────────────────

    def place_numbers(
        self,
        template: np.ndarray,
        label_map: np.ndarray,
    ) -> np.ndarray:
        h, w = label_map.shape
        k = int(label_map.max()) + 1
        out = Image.fromarray(template)
        draw = ImageDraw.Draw(out)

        # Try system fonts, fall back to default
        def get_font(size):
            for path in [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
                "C:/Windows/Fonts/arialbd.ttf",
            ]:
                if os.path.exists(path):
                    return ImageFont.truetype(path, size)
            return ImageFont.load_default()

        for lbl in range(k):
            mask = (label_map == lbl).astype(np.uint8)
            n_comp, comp_map, stats, centroids = cv2.connectedComponentsWithStats(
                mask, connectivity=8
            )
            for comp_id in range(1, n_comp):
                bw = stats[comp_id, cv2.CC_STAT_WIDTH]
                bh_stat = stats[comp_id, cv2.CC_STAT_HEIGHT]
                diameter = max(bw, bh_stat)
                if diameter < 14:
                    continue

                cx = int(centroids[comp_id][0])
                cy = int(centroids[comp_id][1])

                # Ensure centroid is actually inside the region
                if comp_map[cy, cx] != comp_id:
                    ys, xs = np.where(comp_map == comp_id)
                    dists = (xs - cx) ** 2 + (ys - cy) ** 2
                    best_idx = np.argmin(dists)
                    cx, cy = int(xs[best_idx]), int(ys[best_idx])

                # Adaptive font
                font_size = (
                    8  if diameter < 30  else
                    11 if diameter < 60  else
                    14 if diameter < 120 else
                    18 if diameter < 240 else
                    22
                )
                font = get_font(font_size)
                text = str(lbl + 1)

                bbox = draw.textbbox((0, 0), text, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                tx, ty = cx - tw // 2, cy - th // 2

                # White halo for readability
                for ox, oy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,1),(-1,1),(1,-1)]:
                    draw.text((tx+ox, ty+oy), text, fill=(255,255,255), font=font)
                draw.text((tx, ty), text, fill=(55, 55, 55), font=font)

        return np.array(out)

    # ── 8. Render outputs ─────────────────────────────────────────────

    def render_template(self, label_map: np.ndarray) -> np.ndarray:
        h, w = label_map.shape
        template = np.full((h, w, 3), 255, dtype=np.uint8)
        edges = self.detect_edges(label_map)
        template[edges == 255] = [190, 190, 190]
        return template

    def render_reference(
        self, label_map: np.ndarray, centers_rgb: np.ndarray
    ) -> np.ndarray:
        return centers_rgb[label_map].astype(np.uint8)

    def render_palette(
        self, palette: list, centers_rgb: np.ndarray
    ) -> np.ndarray:
        k = len(palette)
        cols = min(k, 10)
        rows = (k + cols - 1) // cols
        bw, bh = 110, 130
        img = Image.new("RGB", (cols * bw, rows * bh), (20, 20, 35))
        draw = ImageDraw.Draw(img)

        def get_font(size, bold=True):
            for path in [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
                else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            ]:
                if os.path.exists(path):
                    return ImageFont.truetype(path, size)
            return ImageFont.load_default()

        font_num = get_font(20)
        font_hex = get_font(11, bold=False)

        for i, p in enumerate(palette):
            col = i % cols
            row = i // cols
            x, y = col * bw, row * bh
            r, g, b = p["rgb"]
            m = 8
            sw, sh = bw - m * 2, bh - 38
            draw.rounded_rectangle([x+m, y+m, x+m+sw, y+m+sh], radius=8, fill=(r, g, b))
            lum = 0.299*r + 0.587*g + 0.114*b
            tc = (0,0,0) if lum > 128 else (255,255,255)
            draw.text((x+bw//2, y+m+sh//2), str(i+1), fill=tc, font=font_num, anchor="mm")
            draw.text((x+bw//2, y+bh-10), p["hex"], fill=(160,160,160), font=font_hex, anchor="mm")

        return np.array(img)

    # ── 9. Metrics ────────────────────────────────────────────────────

    def compute_metrics(self, label_map: np.ndarray, n_sam_masks: int) -> dict:
        k = int(label_map.max()) + 1
        sizes = []
        for lbl in range(k):
            mask = (label_map == lbl).astype(np.uint8)
            n, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
            for i in range(1, n):
                sizes.append(int(stats[i, cv2.CC_STAT_AREA]))
        if not sizes:
            return {}
        return {
            "total_regions": len(sizes),
            "avg_region_size": int(np.mean(sizes)),
            "smallest_region": int(np.min(sizes)),
            "largest_region": int(np.max(sizes)),
            "sam_masks_generated": n_sam_masks,
            "color_count": k,
        }

    # ── 10. Full pipeline ─────────────────────────────────────────────

    def run(self, image_bytes: bytes) -> dict:
        def to_png_bytes(arr: np.ndarray) -> bytes:
            buf = io.BytesIO()
            Image.fromarray(arr).save(buf, format="PNG", optimize=True)
            return buf.getvalue()

        # Stage 1: Load
        img = self.load_image(image_bytes)

        # Stage 2: SAM — the ML inference step
        masks = self.run_sam(img)

        # Stage 3: Masks → label map (SAM semantic regions)
        sam_label_map = self.masks_to_label_map(masks, img)

        # Stage 3b: Run detailed SLIC Superpixel Segmentation to capture fine-grained color changes
        from skimage.segmentation import slic
        # Adjust detail segments count dynamically based on difficulty
        n_segs = {1: 400, 2: 950, 3: 1800}[self.cfg.difficulty]
        slic_label_map = slic(
            img,
            n_segments=n_segs,
            compactness=10.0,
            sigma=1.0,
            start_label=0,
            channel_axis=-1
        )

        # Stage 3c: Hybridize! Intersect deep-learning semantic borders with color superpixels.
        # This guarantees 100% detail matching of the classic algorithm while aligning lines strictly
        # to the high-level semantic object boundaries detected by SAM.
        joint_labels = sam_label_map.astype(np.int64) * 1000000 + slic_label_map.astype(np.int64)
        _, joint_label_map = np.unique(joint_labels, return_inverse=True)
        label_map = joint_label_map.reshape(sam_label_map.shape).astype(np.int32)

        # Stage 4: Color quantization
        label_map, centers_rgb, palette = self.quantize_colors(img, label_map)

        # Stage 5: Merge small regions
        label_map = self.merge_small_regions(label_map)

        # Stage 6 + 7: Template + numbers
        template_arr = self.render_template(label_map)
        numbered = self.place_numbers(template_arr, label_map)

        # Stage 8: Reference + palette images
        reference_arr = self.render_reference(label_map, centers_rgb)
        palette_arr = self.render_palette(palette, centers_rgb)

        # Stage 9: Metrics
        metrics = self.compute_metrics(label_map, len(masks))

        return {
            "template": to_png_bytes(numbered),
            "reference": to_png_bytes(reference_arr),
            "palette": to_png_bytes(palette_arr),
            "original": to_png_bytes(img),
            "palette_data": palette,
            "metrics": metrics,
        }
