"""
SFace Face Recognition Module.
Uses OpenCV's cv2.FaceRecognizerSF with the official pretrained ONNX model.
Extracts 128-dimensional unit-normalized facial embeddings and computes cosine similarity.
"""

import os
import cv2
import numpy as np

class SFaceRecognizer:
    def __init__(self, model_path: str, cosine_threshold: float = 0.363, l2_threshold: float = 1.128):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"SFace model not found at: {model_path}")

        self.model_path = model_path
        self.cosine_threshold = cosine_threshold
        self.l2_threshold = l2_threshold
        
        self.recognizer = cv2.FaceRecognizerSF.create(
            model=model_path,
            config="",
            backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
            target_id=cv2.dnn.DNN_TARGET_CPU
        )

    def extract_embedding(self, image_bgr: np.ndarray, raw_face: np.ndarray) -> np.ndarray:
        """
        Aligns the face and extracts a 128-D normalized embedding vector.
        raw_face: 15-element array from YuNet [x, y, w, h, x1, y1, ..., x5, y5, score]
        """
        aligned_face = self.recognizer.alignCrop(image_bgr, raw_face)
        feature = self.recognizer.feature(aligned_face) # shape: (1, 128)
        feature = feature.flatten()
        # Ensure L2 unit norm
        norm = np.linalg.norm(feature)
        if norm > 0:
            feature = feature / norm
        return feature

    def compute_similarity(self, feat1: np.ndarray, feat2: np.ndarray) -> float:
        """
        Computes cosine similarity between two 128-D vectors.
        Returns value in range [-1.0, 1.0]. Typical matching threshold is ~0.36 to 0.40.
        """
        v1 = feat1.flatten()
        v2 = feat2.flatten()
        dot = np.dot(v1, v2)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(dot / (norm1 * norm2))

    def match_1_to_N(self, target_embedding: np.ndarray, candidates: list, threshold: float = None):
        """
        Matches target_embedding against a list of candidates:
        candidates = [ {"id": 1, "employee_id": 42, "name": "...", "embedding": [128 floats]}, ... ]
        Returns best match or None if below threshold.
        """
        if threshold is None:
            threshold = self.cosine_threshold

        best_score = -1.0
        best_candidate = None

        target_vec = target_embedding.flatten()
        for cand in candidates:
            emb = cand.get("embedding")
            if not emb:
                continue
            cand_vec = np.array(emb, dtype=np.float32).flatten()
            score = self.compute_similarity(target_vec, cand_vec)
            if score > best_score:
                best_score = score
                best_candidate = {**cand, "similarity": score}

        is_match = best_score >= threshold
        return {
            "matched": is_match,
            "best_match": best_candidate if is_match else None,
            "top_candidate": best_candidate, # Even if below threshold, for debugging/audit
            "score": best_score,
            "threshold": threshold
        }
