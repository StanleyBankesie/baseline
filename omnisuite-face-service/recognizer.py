"""
InsightFace ArcFace Recognition Module.
Extracts 512-dimensional unit-normalized facial embeddings and computes cosine similarity.
Replaces legacy OpenCV SFace 128-D implementation.
"""

import numpy as np

class InsightFaceRecognizer:
    def __init__(self, cosine_threshold: float = 0.45):
        self.cosine_threshold = cosine_threshold

    def extract_embedding(self, image_bgr: np.ndarray, raw_face) -> np.ndarray:
        """
        Extracts 512-D unit-normalized embedding from InsightFace face object.
        """
        if raw_face is None or not hasattr(raw_face, "embedding") or raw_face.embedding is None:
            raise ValueError("No valid InsightFace face object provided.")

        embedding = np.array(raw_face.embedding, dtype=np.float32).flatten()
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding

    def compute_similarity(self, feat1: np.ndarray, feat2: np.ndarray) -> float:
        """
        Computes cosine similarity between two 512-D vectors.
        Returns value in range [-1.0, 1.0].
        InsightFace ArcFace typical match threshold is ~0.40 - 0.45.
        """
        v1 = feat1.flatten().astype(np.float32)
        v2 = feat2.flatten().astype(np.float32)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        v1 = v1 / norm1
        v2 = v2 / norm2
        dot = float(np.dot(v1, v2))
        return max(-1.0, min(1.0, dot))

    def match_1_to_N(self, target_embedding: np.ndarray, candidates: list, threshold: float = None):
        """
        Matches target_embedding against a list of candidates:
        candidates = [ {"id": 1, "employee_id": 42, "name": "...", "embedding": [512 floats]}, ... ]
        """
        if threshold is None:
            threshold = self.cosine_threshold

        best_score = -1.0
        best_candidate = None

        target_vec = target_embedding.flatten().astype(np.float32)
        norm_target = np.linalg.norm(target_vec)
        if norm_target > 0:
            target_vec = target_vec / norm_target

        for cand in candidates:
            emb = cand.get("embedding")
            if not emb:
                continue
            cand_vec = np.array(emb, dtype=np.float32).flatten()
            norm_cand = np.linalg.norm(cand_vec)
            if norm_cand > 0:
                cand_vec = cand_vec / norm_cand

            score = float(np.dot(target_vec, cand_vec))
            if score > best_score:
                best_score = score
                best_candidate = {**cand, "similarity": round(score, 4)}

        is_match = best_score >= threshold
        return {
            "matched": is_match,
            "best_match": best_candidate if is_match else None,
            "top_candidate": best_candidate,
            "score": round(best_score, 4),
            "threshold": threshold
        }
