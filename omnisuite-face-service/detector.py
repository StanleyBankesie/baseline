"""
YuNet Face Detection and Landmark Alignment Module.
Uses OpenCV's cv2.FaceDetectorYN with the official pretrained ONNX model.
"""

import os
import cv2
import numpy as np

class YuNetDetector:
    def __init__(self, model_path: str, score_threshold: float = 0.75, nms_threshold: float = 0.3, top_k: int = 5000):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"YuNet model not found at: {model_path}")

        self.model_path = model_path
        self.score_threshold = score_threshold
        self.nms_threshold = nms_threshold
        self.top_k = top_k
        self._input_size = (320, 320)
        
        self.detector = cv2.FaceDetectorYN.create(
            model=model_path,
            config="",
            input_size=self._input_size,
            score_threshold=score_threshold,
            nms_threshold=nms_threshold,
            top_k=top_k,
            backend_id=cv2.dnn.DNN_BACKEND_OPENCV,
            target_id=cv2.dnn.DNN_TARGET_CPU
        )

    def detect(self, image_bgr: np.ndarray):
        """
        Detects faces in BGR image.
        Returns:
            list of dicts: [
                {
                    "bbox": [x, y, w, h],
                    "landmarks": [(x1,y1), (x2,y2), (x3,y3), (x4,y4), (x5,y5)], # right_eye, left_eye, nose, right_mouth, left_mouth
                    "score": float,
                    "raw_face": ndarray(1, 15)
                }
            ]
        """
        h, w = image_bgr.shape[:2]
        if (w, h) != self._input_size:
            self._input_size = (w, h)
            self.detector.setInputSize((w, h))

        _, faces = self.detector.detect(image_bgr)
        if faces is None or len(faces) == 0:
            return []

        results = []
        for face in faces:
            bbox = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
            landmarks = [
                (float(face[4]), float(face[5])),   # Right eye
                (float(face[6]), float(face[7])),   # Left eye
                (float(face[8]), float(face[9])),   # Nose tip
                (float(face[10]), float(face[11])), # Right mouth corner
                (float(face[12]), float(face[13]))  # Left mouth corner
            ]
            score = float(face[14])
            results.append({
                "bbox": bbox,
                "landmarks": landmarks,
                "score": score,
                "raw_face": face
            })
            
        # Sort by bounding box area descending (largest face first)
        results.sort(key=lambda item: item["bbox"][2] * item["bbox"][3], reverse=True)
        return results
