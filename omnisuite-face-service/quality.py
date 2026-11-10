"""
Image Quality and Facial Geometry Assessment Module.
Checks for blur (Laplacian variance), illumination, pose angles, face resolution,
and ensures conditions are optimal before biometric enrollment or clock-in.
"""

import cv2
import numpy as np

class QualityAssessor:
    def __init__(
        self,
        min_face_size: int = 100,
        min_blur_score: float = 40.0,
        min_brightness: float = 40.0,
        max_brightness: float = 230.0,
        max_yaw_angle: float = 25.0,
        max_pitch_angle: float = 25.0,
        max_roll_angle: float = 20.0,
    ):
        self.min_face_size = min_face_size
        self.min_blur_score = min_blur_score
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.max_yaw_angle = max_yaw_angle
        self.max_pitch_angle = max_pitch_angle
        self.max_roll_angle = max_roll_angle

    def assess_blur(self, face_bgr: np.ndarray) -> float:
        """
        Calculates Laplacian variance as sharpness index.
        Higher value = sharper image. Typical threshold ~40-60.
        """
        if face_bgr is None or face_bgr.size == 0:
            return 0.0
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

    def assess_illumination(self, face_bgr: np.ndarray) -> dict:
        """
        Calculates mean luminance and contrast.
        """
        if face_bgr is None or face_bgr.size == 0:
            return {"mean": 0.0, "contrast": 0.0, "is_good": False}
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        mean = float(np.mean(gray))
        contrast = float(np.std(gray))
        is_good = (self.min_brightness <= mean <= self.max_brightness) and (contrast >= 20.0)
        return {
            "mean": round(mean, 1),
            "contrast": round(contrast, 1),
            "is_good": is_good
        }

    def estimate_pose(self, landmarks: list) -> dict:
        """
        Estimates yaw, pitch, roll using 5 facial landmarks:
        landmarks: [(rx, ry), (lx, ly), (nx, ny), (rmx, rmy), (lmx, lmy)]
        """
        if len(landmarks) < 5:
            return {"yaw": 0.0, "pitch": 0.0, "roll": 0.0, "is_frontal": True}

        r_eye, l_eye, nose, r_mouth, l_mouth = landmarks[:5]

        # Roll: angle between eyes
        dx = l_eye[0] - r_eye[0]
        dy = l_eye[1] - r_eye[1]
        roll = np.degrees(np.arctan2(dy, dx))

        # Eye midpoint
        eye_center_x = (r_eye[0] + l_eye[0]) / 2.0
        eye_dist = np.hypot(dx, dy)

        # Yaw: nose horizontal displacement from eye center normalized by eye distance
        nose_offset_x = nose[0] - eye_center_x
        yaw = float((nose_offset_x / max(eye_dist, 1.0)) * 90.0)

        # Pitch: nose vertical distance compared to mouth center
        mouth_center_y = (r_mouth[1] + l_mouth[1]) / 2.0
        eye_to_nose = nose[1] - (r_eye[1] + l_eye[1]) / 2.0
        nose_to_mouth = mouth_center_y - nose[1]
        ratio = (eye_to_nose / max(nose_to_mouth, 1.0)) if nose_to_mouth > 0 else 1.0
        pitch = float((ratio - 1.0) * 45.0)

        is_frontal = (
            abs(yaw) <= self.max_yaw_angle and
            abs(pitch) <= self.max_pitch_angle and
            abs(roll) <= self.max_roll_angle
        )

        return {
            "yaw": round(yaw, 1),
            "pitch": round(pitch, 1),
            "roll": round(roll, 1),
            "is_frontal": is_frontal
        }

    def evaluate(self, image_bgr: np.ndarray, face_info: dict) -> dict:
        """
        Runs comprehensive quality analysis on a detected face.
        """
        bbox = face_info["bbox"]
        landmarks = face_info.get("landmarks", [])
        x, y, w, h = bbox

        img_h, img_w = image_bgr.shape[:2]
        # Crop face with margin for quality evaluation
        pad = int(min(w, h) * 0.1)
        x1 = max(0, x - pad)
        y1 = max(0, y - pad)
        x2 = min(img_w, x + w + pad)
        y2 = min(img_h, y + h + pad)

        face_crop = image_bgr[y1:y2, x1:x2]

        blur_score = self.assess_blur(face_crop)
        illumination = self.assess_illumination(face_crop)
        pose = self.estimate_pose(landmarks)

        size_ok = (w >= self.min_face_size) and (h >= self.min_face_size)
        blur_ok = blur_score >= self.min_blur_score
        light_ok = illumination["is_good"]
        pose_ok = pose["is_frontal"]

        reasons = []
        if not size_ok:
            reasons.append(f"Face is too small ({w}x{h} px). Please move closer to camera.")
        if not blur_ok:
            reasons.append(f"Image is blurry (score: {blur_score:.1f}). Hold still.")
        if not light_ok:
            if illumination["mean"] < self.min_brightness:
                reasons.append("Lighting is too dark. Increase ambient light.")
            elif illumination["mean"] > self.max_brightness:
                reasons.append("Lighting is too harsh/bright.")
            else:
                reasons.append("Low contrast lighting.")
        if not pose_ok:
            reasons.append("Face is turned. Please look directly at the camera.")

        passed = size_ok and blur_ok and light_ok and pose_ok

        return {
            "passed": passed,
            "reasons": reasons,
            "blur_score": round(blur_score, 1),
            "blur_ok": blur_ok,
            "illumination": illumination,
            "pose": pose,
            "face_size": {"width": w, "height": h},
            "size_ok": size_ok
        }
