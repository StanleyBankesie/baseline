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
    def __init__(self, model_path: str, scale: float = 2.7, threshold: float = 0.65):
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
        Crops face with scale factor (default 2.7) centered around the face bbox.
        Constrains scale to available image margins to prevent artificial black borders
        which trigger false-positive anti-spoof detections.
        """
        src_h, src_w = image_bgr.shape[:2]
        x, y, w, h = bbox

        box_w = max(1, w)
        box_h = max(1, h)

        # Restrict scale to actual image boundaries so no artificial black border is introduced
        scale = min((src_h - 1) / box_h, (src_w - 1) / box_w, self.scale)

        new_w = box_w * scale
        new_h = box_h * scale
        center_x = x + box_w / 2.0
        center_y = y + box_h / 2.0

        x1 = max(0, int(center_x - new_w / 2.0))
        y1 = max(0, int(center_y - new_h / 2.0))
        x2 = min(src_w - 1, int(center_x + new_w / 2.0))
        y2 = min(src_h - 1, int(center_y + new_h / 2.0))

        cropped = image_bgr[y1 : y2 + 1, x1 : x2 + 1]
        if cropped.size == 0:
            cropped = image_bgr[max(0, y) : min(src_h, y + box_h), max(0, x) : min(src_w, x + box_w)]
        return cropped

    def _preprocess(self, crop: np.ndarray) -> np.ndarray:
        """
        Converts BGR to RGB (model was trained on RGB), resizes to target model input (80x80),
        and transposes to NCHW float32.
        """
        target_h = self.input_shape[2] if len(self.input_shape) >= 4 and isinstance(self.input_shape[2], int) else 80
        target_w = self.input_shape[3] if len(self.input_shape) >= 4 and isinstance(self.input_shape[3], int) else 80

        # MiniFASNet was trained on RGB images
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(crop_rgb, (target_w, target_h))

        blob = resized.astype(np.float32)
        blob = np.transpose(blob, (2, 0, 1))
        blob = np.expand_dims(blob, axis=0)
        return blob

    def evaluate_frame(self, image_bgr: np.ndarray, bbox: list, threshold: float = None) -> dict:
        """
        Runs anti-spoof inference on a single frame.
        Returns:
            {
                "is_real": bool,
                "real_score": float (0.0 to 1.0),
                "spoof_score": float,
                "threshold": float,
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

        # In MiniFASNet: class 1 is Genuine/Real, class 0 (print) and class 2 (screen) are Spoof
        if len(probs) >= 3:
            real_score = float(probs[1])
            spoof_score = float(probs[0] + probs[2])
        elif len(probs) == 2:
            real_score = float(probs[1])
            spoof_score = float(probs[0])
        else:
            real_score = float(probs[0])
            spoof_score = 1.0 - real_score

        cutoff = float(threshold) if threshold is not None else self.threshold
        is_dominant_real = int(np.argmax(probs)) == 1
        passed = bool(is_dominant_real and real_score >= cutoff)

        return {
            "is_real": passed,
            "real_score": round(real_score, 4),
            "spoof_score": round(spoof_score, 4),
            "threshold": cutoff,
            "passed": passed
        }

    def evaluate_multi_frame(self, frames_data: list, threshold: float = None) -> dict:
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

        cutoff = float(threshold) if threshold is not None else self.threshold
        frame_results = []
        real_scores = []
        bboxes = []

        for item in frames_data:
            img = item["image_bgr"]
            bbox = item["bbox"]
            bboxes.append(bbox)
            res = self.evaluate_frame(img, bbox, threshold=cutoff)
            frame_results.append(res)
            real_scores.append(res["real_score"])

        avg_real_score = float(np.mean(real_scores))
        min_real_score = float(np.min(real_scores))

        # Check for static replay attack: standard deviation < 0.0001 across frames means exact same static image repeated
        micro_motion_detected = True
        if len(bboxes) >= 3:
            centers_x = [b[0] + b[2] / 2.0 for b in bboxes]
            centers_y = [b[1] + b[3] / 2.0 for b in bboxes]
            std_x = np.std(centers_x)
            std_y = np.std(centers_y)
            if std_x < 0.0001 and std_y < 0.0001:
                micro_motion_detected = False

        passed = (avg_real_score >= cutoff) and micro_motion_detected

        reasons = []
        if avg_real_score < cutoff:
            reasons.append(f"Anti-spoof check failed (confidence: {avg_real_score:.2f} < {cutoff:.2f})")
        if not micro_motion_detected:
            reasons.append("Identical static photograph replayed. Live motion required.")

        return {
            "liveness_passed": passed,
            "confidence": round(avg_real_score, 3),
            "min_score": round(min_real_score, 3),
            "threshold": cutoff,
            "micro_motion": micro_motion_detected,
            "reasons": reasons,
            "frame_results": frame_results
        }
