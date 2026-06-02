"""
main.py
-------
FastAPI server exposing two paint-by-numbers generation modes:

  POST /generate/classic   — fast, JS-compatible (KMeans + SLIC)
  POST /generate/ml        — SAM-powered ML segmentation  ← the good one

Both return the same JSON shape so the frontend can swap modes freely.
"""

import base64
import io
import zipfile
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from sam_pipeline import SAMPaintByNumbersPipeline, SAMPBNConfig
from classic_pipeline import ClassicPBNPipeline, ClassicPBNConfig


# ─── Lifespan: load SAM model once at startup ────────────────────────────────

ml_pipeline: SAMPaintByNumbersPipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_pipeline
    try:
        cfg = SAMPBNConfig(sam_model_type=os.getenv("SAM_MODEL", "vit_b"))
        ml_pipeline = SAMPaintByNumbersPipeline(cfg)
        print("✅ SAM pipeline ready")
    except FileNotFoundError as e:
        print(f"⚠️  SAM weights not found — /generate/ml will return 503. Run download_sam.py first.\n   {e}")
        ml_pipeline = None
    yield
    # Cleanup (nothing needed for SAM)


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Paint-by-Numbers API",
    description="Two modes: classic algorithm and SAM-powered ML",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # lock this down in production
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ─── Shared helpers ───────────────────────────────────────────────────────────

def result_to_response(result: dict, as_zip: bool) -> StreamingResponse | JSONResponse:
    if as_zip:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("template.png",  result["template"])
            zf.writestr("reference.png", result["reference"])
            zf.writestr("palette.png",   result["palette"])
            zf.writestr("original.png",  result["original"])
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": "attachment; filename=pbn.zip"},
        )

    return JSONResponse({
        "template":     base64.b64encode(result["template"]).decode(),
        "reference":    base64.b64encode(result["reference"]).decode(),
        "palette":      base64.b64encode(result["palette"]).decode(),
        "original":     base64.b64encode(result["original"]).decode(),
        "palette_data": result["palette_data"],
        "metrics":      result["metrics"],
        "mode":         result.get("mode", "unknown"),
    })


def validate_params(n_colors: int, difficulty: int):
    if not (4 <= n_colors <= 24):
        raise HTTPException(400, "n_colors must be between 4 and 24")
    if difficulty not in (1, 2, 3):
        raise HTTPException(400, "difficulty must be 1, 2, or 3")


# ─── Route: classic mode (fast, no ML) ───────────────────────────────────────

@app.post("/generate/classic", summary="Classic algorithm mode (fast)")
async def generate_classic(
    image: UploadFile = File(..., description="Image file (JPG, PNG, WEBP)"),
    n_colors: int = Form(12, description="Number of colors (4–24)"),
    difficulty: int = Form(2, description="1=easy, 2=medium, 3=hard"),
    target_width: int = Form(900),
    as_zip: bool = Form(False, description="Return ZIP instead of JSON"),
):
    validate_params(n_colors, difficulty)
    image_bytes = await image.read()

    cfg = ClassicPBNConfig(
        n_colors=n_colors,
        difficulty=difficulty,
        target_width=target_width,
    )
    try:
        result = ClassicPBNPipeline(cfg).run(image_bytes)
        result["mode"] = "classic"
    except Exception as e:
        raise HTTPException(500, f"Classic pipeline error: {e}")

    return result_to_response(result, as_zip)


# ─── Route: ML mode (SAM) ─────────────────────────────────────────────────────

@app.post("/generate/ml", summary="SAM ML mode (better quality)")
async def generate_ml(
    image: UploadFile = File(..., description="Image file (JPG, PNG, WEBP)"),
    n_colors: int = Form(12, description="Number of colors (4–24)"),
    difficulty: int = Form(2, description="1=easy, 2=medium, 3=hard"),
    target_width: int = Form(900),
    as_zip: bool = Form(False, description="Return ZIP instead of JSON"),
):
    if ml_pipeline is None:
        raise HTTPException(
            503,
            detail="SAM model not loaded. Run: python download_sam.py --model vit_b",
        )

    validate_params(n_colors, difficulty)

    # Override pipeline config per-request (difficulty + n_colors can vary)
    ml_pipeline.cfg.n_colors = n_colors
    ml_pipeline.cfg.difficulty = difficulty
    ml_pipeline.cfg.target_width = target_width

    image_bytes = await image.read()

    try:
        result = ml_pipeline.run(image_bytes)
        result["mode"] = "ml"
    except Exception as e:
        raise HTTPException(500, f"ML pipeline error: {e}")

    return result_to_response(result, as_zip)


# ─── Health & info ────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "sam_loaded": ml_pipeline is not None,
        "sam_model": ml_pipeline.cfg.sam_model_type if ml_pipeline else None,
    }


@app.get("/")
def root():
    return {
        "endpoints": {
            "classic": "POST /generate/classic",
            "ml":      "POST /generate/ml",
            "health":  "GET  /health",
            "docs":    "GET  /docs",
        }
    }
