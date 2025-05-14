import cv2
import numpy as np
from pathlib import Path

outdir = Path("python/local_test_output_frames")
outdir.mkdir(parents=True, exist_ok=True)

dummy = np.zeros((100, 100, 3), dtype=np.uint8)
cv2.imwrite(str(outdir / "test_output.jpg"), dummy)
