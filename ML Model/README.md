# Paint-by-Numbers ML Backend

## Project Structure
```
pbn-sam/backend/
├── main.py              ← FastAPI server (2 endpoints)
├── sam_pipeline.py      ← SAM ML pipeline
├── classic_pipeline.py  ← Classic algorithm pipeline
├── download_sam.py      ← One-time weights downloader
├── requirements.txt
└── models/              ← SAM weights go here (auto-created)
```

---

## Setup (run once)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download SAM weights
#    vit_b = 375MB  — good quality, fast        ← recommended to start
#    vit_l = 1.2GB  — better quality
#    vit_h = 2.4GB  — best quality, slow
python download_sam.py --model vit_b

# 3. Start server
uvicorn main:app --reload --port 8000
```

---

## API Endpoints

### ML Mode (SAM)
```
POST /generate/ml
```
| Field | Type | Default | Description |
|---|---|---|---|
| image | File | required | JPG / PNG / WEBP |
| n_colors | int | 12 | Number of paint colors (4–24) |
| difficulty | int | 2 | 1=easy, 2=medium, 3=hard |
| target_width | int | 900 | Output image width in px |
| as_zip | bool | false | Return ZIP file instead of JSON |

### Classic Mode (no ML)
```
POST /generate/classic
```
Same fields as above.

### Health Check
```
GET /health
```

---

## Response (JSON mode)

```json
{
  "template":     "<base64 PNG>",
  "reference":    "<base64 PNG>",
  "palette":      "<base64 PNG>",
  "original":     "<base64 PNG>",
  "palette_data": [
    { "index": 1, "hex": "#3a7bd5", "rgb": [58, 123, 213] }
  ],
  "metrics": {
    "total_regions": 142,
    "avg_region_size": 1820,
    "smallest_region": 31,
    "largest_region": 48200,
    "sam_masks_generated": 87,
    "color_count": 12
  },
  "mode": "ml"
}
```

---

## Calling from your frontend

```typescript
async function callMLBackend(
  file: File,
  nColors: number,
  difficulty: 1 | 2 | 3,
  mode: "ml" | "classic" = "ml"
) {
  const form = new FormData();
  form.append("image", file);
  form.append("n_colors", String(nColors));
  form.append("difficulty", String(difficulty));

  const res = await fetch(`http://localhost:8000/generate/${mode}`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  return {
    templateDataUrl:  `data:image/png;base64,${data.template}`,
    referenceDataUrl: `data:image/png;base64,${data.reference}`,
    paletteDataUrl:   `data:image/png;base64,${data.palette}`,
    originalDataUrl:  `data:image/png;base64,${data.original}`,
    palette:          data.palette_data,
    metrics:          data.metrics,
    mode:             data.mode,
  };
}
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| SAM_MODEL | vit_b | Which SAM model to load at startup |
| PORT | 8000 | Server port |

```bash
SAM_MODEL=vit_l uvicorn main:app --port 8000
```

---

## GPU vs CPU

- If you have an NVIDIA GPU with CUDA, SAM automatically uses it (~2–3s per image)
- CPU only: SAM takes ~15–30s per image depending on size
- The classic pipeline runs fast on CPU regardless (~1–2s)

---

## What SAM actually does (for interviews)

SAM (Segment Anything Model) is a Vision Transformer trained by Meta AI on
11 million images and 1 billion masks — the largest segmentation dataset ever made.

In this pipeline:
1. SAM's image encoder converts the photo into dense feature embeddings
2. A grid of prompt points is automatically placed across the image
3. SAM's mask decoder predicts a segmentation mask for each prompt point
4. Overlapping/low-confidence masks are filtered by stability score and IOU threshold
5. The resulting masks become the regions of your paint-by-numbers template

This is fundamentally different from the classic approach (SLIC + KMeans) because
SAM understands *what objects are* — it separates a face from hair from background
as distinct semantic regions, not just color blobs.
