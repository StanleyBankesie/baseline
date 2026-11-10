"""
Anti-Spoofing and Liveness Verification Module.
Uses MiniFASNet ONNX model to evaluate real vs spoof presentation,
plus multi-frame micro-motion and temporal consistency validation.
"""

import os
import cv2
import numpy as np
import onnxruntime as ort

class MiniFASNetLiveness:
    def __init__(self, model_path: str, scale: float = 2.7, threshold: float = 0.85):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Anti-spoofing model not found at: {model_path}")

        self.model_path = model_path
        self.scale = scale
        self.threshold = threshold

        # Initialize ONNX Runtime session with CPU execution provider
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self.session = ort.InferenceSession(model_path, sess_options=opts, providers=['CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape # Typically [1, 3, 80, 80]
        self.output_name = self.session.get_outputs()[0].name

    def _crop_face_scaled(self, image_bgr: np.ndarray, bbox: list) -> np.ndarray:
        """
        Crops face with scale factor (default 2.7) centered around the face bbox,
        with zero-padding for borders.
        """
        img_h, img_w = image_bgr.shape[:2]
        x, y, w, h = bbox

        # Calculate expanded box
        box_size = max(w, h) * self.scale
        cx = x + w / 2.0
        cy = y + h / 2.0

        x1 = int(cx - box_size / 2.0)
        y1 = int(cy - box_size / 2.0)
        x2 = int(cx + box_size / 2.0)
        y2 = int(cy + box_size / 2.0)

        # Pad if outside image bounds
        pad_left = max(0, -x1)
        pad_top = max(0, -y1)
        pad_right = max(0, x2 - img_w)
        pad_bottom = max(0, y2 - img_h)

        crop_x1 = max(0, x1)
        crop_y1 = max(0, y1)
        crop_x2 = min(img_w, x2)
        crop_y2 = min(img_h, y2)

        cropped = image_bgr[crop_y1:crop_y2, crop_x1:crop_x2]
        if pad_left > 0 or pad_top > 0 or pad_right > 0 or pad_bottom > 0:
            cropped = cv2.copyMakeBorder(
                cropped,
                pad_top, pad_bottom, pad_left, pad_right,
                cv2.BORDER_CONSTANT, value=[0, 0, 0]
            )
        return cropped

    def _preprocess(self, crop: np.ndarray) -> np.ndarray:
        """
        Resizes to target model input (80x80), transposes to NCHW float32.
        """
        target_h = self.input_shape[2] if len(self.input_shape) >= 4 and isinstance(self.input_shape[2], int) else 80
        target_w = self.input_shape[3] if len(self.input_shape) >= 4 and isinstance(self.input_shape[3], int) else 80

        resized = cv2.resize(crop, (target_w, target_h))
        # Keep BGR as expected by MiniFASNet
        blob = resized.astype(np.float32)
        # Transpose HWC -> CHW
        blob = np.transpose(blob, (2, 0, 1))
        # Add batch dim -> 1x3xHxW
        blob = np.expand_dims(blob, axis=0)
        return blob

    def evaluate_frame(self, image_bgr: np.ndarray, bbox: list) -> dict:
        """
        Runs anti-spoof inference on a single frame.
        Returns:
            {
                "is_real": bool,
                "real_score": float (0.0 to 1.0),
                "spoof_score": float,
                "passed": bool
            }
        """
        crop = self._crop_face_scaled(image_bgr, bbox)
        blob = self._preprocess(crop)

        outputs = self.session.run([self.output_name], {self.input_name: blob})
        raw_output = outputs[0][0] # 1D array of logits or probabilities

        # Softmax
        exp_vals = np.exp(raw_output - np.max(raw_output))
        probs = exp_vals / np.sum(exp_vals)

        # In MiniFASNet: class 1 is Genuine/Real, class 0 (and class 2 if 3-class) is Spoof
        if len(probs) >= 3:
            real_score = float(probs[1])
            spoof_score = float(probs[0] + probs[2])
        elif len(probs) == 2:
            real_score = float(probs[1])
            spoof_score = float(probs[0])
        else:
            real_score = float(probs[0])
            spoof_score = 1.0 - real_score

        passed = real_score >= self.threshold

        return {
            "is_real": bool(passed),
            "real_score": round(real_score, 4),
            "spoof_score": round(spoof_score, 4),
            "passed": bool(passed)
        }

    def evaluate_multi_frame(self, frames_data: list) -> dict:
        """
        Evaluates a sequence of frames for temporal liveness and anti-spoofing.
        frames_data: list of dicts: [ {"image_bgr": ndarray, "bbox": [x,y,w,h], "landmarks": [...]}, ... ]
        """
        if not frames_data:
            return {
                "liveness_passed": False,
                "confidence": 0.0,
                "reason": "No frames provided",
                "details": []
            }

        frame_results = []
        real_scores = []
        bboxes = []

        for item in frames_data:
            img = item["image_bgr"]
            bbox = item["bbox"]
            bboxes.append(bbox)
            res = self.evaluate_frame(img, bbox)
            frame_results.append(res)
            real_scores.append(res["real_score"])

        avg_real_score = float(np.mean(real_scores))
        min_real_score = float(np.min(real_scores))

        # Check for static presentation attack (e.g. holding a photo perfectly still)
        # Bounding box centers across 3+ frames should have subtle physiological jitter (unless completely synthetic)
        micro_motion_detected = True
        if len(bboxes) >= 3:
            centers_x = [b[0] + b[2] / 2.0 for b in bboxes]
            centers_y = [b[1] + b[3] / 2.0 for b in bboxes]
            std_x = np.std(centers_x)
            std_y = np.std(centers_y)
            # If standard deviation is exactly 0 across multiple frames, suspicious static image feed
            if std_x < 0.01 and std_y < 0.01:
                micro_motion_detected = False

        passed = (avg_real_score >= self.threshold) and (min_real_score >= (self.threshold - 0.15)) and micro_motion_detected

        reasons = []
        if avg_real_score < self.threshold:
            reasons.append(f"Anti-spoof check failed (confidence: {avg_real_score:.2f} < {self.threshold:.2f})")
        if not micro_motion_detected:
            reasons.append("Static photograph detected. Natural micro-movement required.")

        return {
            "liveness_passed": passed,
            "confidence": round(avg_real_score, 3),
            "min_score": round(min_real_score, 3),
            "micro_motion": micro_motion_detected,
            "reasons": reasons,
            "frame_results": frame_results
        }
