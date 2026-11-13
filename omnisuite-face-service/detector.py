"""
InsightFace Face Detection and Landmark Alignment Module.
Uses InsightFace SCRFD detector with landmark alignment.
Replaces legacy OpenCV YuNet implementation.
"""

import os
import warnings
import numpy as np
from insightface.app import FaceAnalysis

# Suppress scikit-image / insightface estimate deprecation notice
warnings.filterwarnings("ignore", category=FutureWarning)

class InsightFaceDetector:
    def __init__(self, root_dir: str, det_size=(640, 640), score_threshold: float = 0.5):
        self.root_dir = root_dir
        self.score_threshold = score_threshold
        self.det_size = det_size

        self.app = FaceAnalysis(
            name="buffalo_sc",
            root=root_dir,
            providers=["CPUExecutionProvider"]
        )
        self.app.prepare(ctx_id=-1, det_size=det_size)

    def detect(self, image_bgr: np.ndarray):
        """
        Detects faces in BGR image using InsightFace SCRFD.
        Returns:
            list of dicts: [
                {
                    "bbox": [x, y, w, h],
                    "landmarks": [(x1,y1), (x2,y2), (x3,y3), (x4,y4), (x5,y5)],
                    "score": float,
                    "raw_face": face_object
                }
            ]
        """
        if image_bgr is None or image_bgr.size == 0:
            return []

        faces = self.app.get(image_bgr)
        if not faces:
            return []

        results = []
        for face in faces:
            det_score = float(getattr(face, "det_score", 0.9))
            if det_score < self.score_threshold:
                continue

            # face.bbox is [x1, y1, x2, y2]
            x1, y1, x2, y2 = [int(round(v)) for v in face.bbox]
            w = max(0, x2 - x1)
            h = max(0, y2 - y1)
            bbox = [x1, y1, w, h]

            landmarks = []
            if hasattr(face, "kps") and face.kps is not None:
                landmarks = [(float(pt[0]), float(pt[1])) for pt in face.kps]

            results.append({
                "bbox": bbox,
                "landmarks": landmarks,
                "score": round(det_score, 4),
                "raw_face": face
            })

        # Sort largest face first
        results.sort(key=lambda item: item["bbox"][2] * item["bbox"][3], reverse=True)
        return results
