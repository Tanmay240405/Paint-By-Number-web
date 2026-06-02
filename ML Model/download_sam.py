"""
download_sam.py
---------------
Run this ONCE before starting the server to download SAM weights.

Usage:
    python download_sam.py --model vit_b   # ~375 MB  (fastest, good quality)
    python download_sam.py --model vit_l   # ~1.2 GB  (better quality)
    python download_sam.py --model vit_h   # ~2.4 GB  (best quality, slow)
"""

import argparse
import os
import requests
from tqdm import tqdm

MODELS = {
    "vit_b": {
        "url": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
        "filename": "sam_vit_b_01ec64.pth",
        "size": "375 MB",
    },
    "vit_l": {
        "url": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_l_0b3195.pth",
        "filename": "sam_vit_l_0b3195.pth",
        "size": "1.2 GB",
    },
    "vit_h": {
        "url": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_h_4b8939.pth",
        "filename": "sam_vit_h_4b8939.pth",
        "size": "2.4 GB",
    },
}

def download(model_type: str):
    info = MODELS[model_type]
    out_dir = os.path.join(os.path.dirname(__file__), "models")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, info["filename"])

    if os.path.exists(out_path):
        print(f"✅ Already downloaded: {out_path}")
        return out_path

    print(f"⬇️  Downloading SAM {model_type} ({info['size']}) ...")
    r = requests.get(info["url"], stream=True)
    total = int(r.headers.get("content-length", 0))
    with open(out_path, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)
            bar.update(len(chunk))

    print(f"✅ Saved to {out_path}")
    return out_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", choices=["vit_b", "vit_l", "vit_h"], default="vit_b")
    args = parser.parse_args()
    download(args.model)
