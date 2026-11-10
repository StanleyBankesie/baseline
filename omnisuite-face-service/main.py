"""
OmniSuite ERP Biometric Facial Recognition Microservice.
FastAPI Application providing Face Detection (YuNet), Feature Extraction (SFace),
Anti-Spoofing & Liveness (MiniFASNet), and Image Quality Assessment.
"""

import os
import sys
import base64
import time
from typing import List, Optional
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from detector import YuNetDetector
from recognizer import SFaceRecognizer
from quality import QualityAssessor
from liveness import MiniFASNetLiveness

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEIGHTS_DIR = os.path.join(BASE_DIR, "weights")

YUNET_PATH = os.path.join(WEIGHTS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(WEIGHTS_DIR, "face_recognition_sface_2021dec.onnx")
LIVENESS_PATH = os.path.join(WEIGHTS_DIR, "MiniFASNetV2.onnx")

app = FastAPI(
    title="OmniSuite ERP Biometric Facial Recognition Service",
    version="1.0.0",
    description="Independent facial recognition, liveness, and quality service."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global models initialized on startup
detector: Optional[YuNetDetector] = None
recognizer: Optional[SFaceRecognizer] = None
quality_assessor: Optional[QualityAssessor] = None
liveness_model: Optional[MiniFASNetLiveness] = None

@app.on_event("startup")
def load_models():
    global detector, recognizer, quality_assessor, liveness_model
    print("[INFO] Initializing YuNet Detector...")
    detector = YuNetDetector(YUNET_PATH)
    print("[INFO] Initializing SFace Recognizer...")
    recognizer = SFaceRecognizer(SFACE_PATH)
    print("[INFO] Initializing Quality Assessor...")
    quality_assessor = QualityAssessor()
    print("[INFO] Initializing MiniFASNet Liveness...")
    liveness_model = MiniFASNetLiveness(LIVENESS_PATH)
    print("[SUCCESS] All Biometric Models Initialized Successfully.")

def decode_base64_image(b64_str: str) -> np.ndarray:
    """Decodes base64 string (with or without data:image/... prefix) to OpenCV BGR ndarray."""
    try:
        if "," in b64_str:
            b64_str = b64_str.split(",", 1)[1]
        raw_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(raw_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image data.")
        return img
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format: {str(e)}"
        )

# Pydantic Schemas
class ExtractRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG or PNG image")
    check_liveness: bool = True
    liveness_threshold: Optional[float] = 0.85

class VerifyRequest(BaseModel):
    probe_image: str = Field(..., description="Captured face image base64")
    enrolled_embedding: List[float] = Field(..., description="128-D vector")
    threshold: Optional[float] = 0.38
    check_liveness: bool = True

class Candidate(BaseModel):
    id: Optional[int] = None
    employee_id: int
    name: Optional[str] = None
    emp_code: Optional[str] = None
    embedding: List[float]

class IdentifyRequest(BaseModel):
    probe_image: str = Field(..., description="Primary captured image")
    additional_frames: Optional[List[str]] = Field(default=[], description="Optional 2-4 consecutive frames for multi-frame liveness")
    candidates: List[Candidate] = Field(..., description="Company-scoped employee templates")
    threshold: Optional[float] = 0.38
    check_liveness: bool = True
    liveness_threshold: Optional[float] = 0.85

class LivenessRequest(BaseModel):
    frames: List[str] = Field(..., description="List of 1 to 5 base64 frames")
    threshold: Optional[float] = 0.85

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "omnisuite-face-service",
        "models": {
            "detector": detector is not None,
            "recognizer": recognizer is not None,
            "liveness": liveness_model is not None,
            "quality": quality_assessor is not None
        },
        "timestamp": time.time()
    }

@app.post("/api/v1/extract-embedding")
def extract_embedding_endpoint(payload: ExtractRequest):
    img = decode_base64_image(payload.image)
    faces = detector.detect(img)
    if not faces:
        return {
            "success": False,
            "face_detected": False,
            "message": "No face detected in the image. Please position your face inside the guide."
        }

    # Use largest detected face
    primary_face = faces[0]
    raw_face = primary_face["raw_face"]
    bbox = primary_face["bbox"]
    landmarks = primary_face["landmarks"]

    quality = quality_assessor.evaluate(img, primary_face)

    liveness_result = None
    if payload.check_liveness and liveness_model:
        liveness_result = liveness_model.evaluate_frame(img, bbox)

    embedding = recognizer.extract_embedding(img, raw_face)

    return {
        "success": True,
        "face_detected": True,
        "multiple_faces": len(faces) > 1,
        "face_count": len(faces),
        "quality_passed": quality["passed"],
        "quality": quality,
        "liveness_passed": liveness_result["passed"] if liveness_result else True,
        "liveness": liveness_result,
        "bbox": bbox,
        "landmarks": landmarks,
        "embedding": [float(x) for x in embedding]
    }

@app.post("/api/v1/verify-match")
def verify_match_endpoint(payload: VerifyRequest):
    img = decode_base64_image(payload.probe_image)
    faces = detector.detect(img)
    if not faces:
        return {
            "success": False,
            "matched": False,
            "message": "No face detected in camera capture."
        }

    primary_face = faces[0]
    bbox = primary_face["bbox"]
    raw_face = primary_face["raw_face"]

    quality = quality_assessor.evaluate(img, primary_face)
    liveness_result = None
    if payload.check_liveness and liveness_model:
        liveness_result = liveness_model.evaluate_frame(img, bbox)
        if not liveness_result["passed"]:
            return {
                "success": False,
                "matched": False,
                "liveness_passed": False,
                "liveness": liveness_result,
                "quality": quality,
                "message": "Liveness verification failed. Presentation attack suspected."
            }

    probe_emb = recognizer.extract_embedding(img, raw_face)
    enrolled_vec = np.array(payload.enrolled_embedding, dtype=np.float32)
    similarity = recognizer.compute_similarity(probe_emb, enrolled_vec)

    threshold = payload.threshold or recognizer.cosine_threshold
    matched = similarity >= threshold

    return {
        "success": True,
        "matched": matched,
        "similarity": round(float(similarity), 4),
        "threshold": threshold,
        "quality_passed": quality["passed"],
        "quality": quality,
        "liveness_passed": liveness_result["passed"] if liveness_result else True,
        "liveness": liveness_result
    }

@app.post("/api/v1/identify")
def identify_endpoint(payload: IdentifyRequest):
    """
    1:N identification: Compares face against authorized employees for the tenant.
    """
    start_t = time.time()
    img = decode_base64_image(payload.probe_image)
    faces = detector.detect(img)
    if not faces:
        return {
            "success": False,
            "identified": False,
            "message": "No face detected. Please face the camera squarely."
        }

    primary_face = faces[0]
    bbox = primary_face["bbox"]
    raw_face = primary_face["raw_face"]

    # Image Quality check
    quality = quality_assessor.evaluate(img, primary_face)
    if not quality["passed"]:
        return {
            "success": False,
            "identified": False,
            "quality_passed": False,
            "quality": quality,
            "message": f"Quality requirement not met: {', '.join(quality['reasons'])}"
        }

    # Anti-spoofing check
    liveness_summary = None
    if payload.check_liveness and liveness_model:
        frames_to_check = [{"image_bgr": img, "bbox": bbox, "landmarks": primary_face["landmarks"]}]
        for extra_b64 in (payload.additional_frames or []):
            try:
                extra_img = decode_base64_image(extra_b64)
                extra_faces = detector.detect(extra_img)
                if extra_faces:
                    frames_to_check.append({
                        "image_bgr": extra_img,
                        "bbox": extra_faces[0]["bbox"],
                        "landmarks": extra_faces[0]["landmarks"]
                    })
            except Exception:
                pass

        if len(frames_to_check) > 1:
            liveness_summary = liveness_model.evaluate_multi_frame(frames_to_check)
        else:
            single_res = liveness_model.evaluate_frame(img, bbox)
            liveness_summary = {
                "liveness_passed": single_res["passed"],
                "confidence": single_res["real_score"],
                "micro_motion": True,
                "reasons": ["Single frame evaluated"],
                "frame_results": [single_res]
            }

        if not liveness_summary["liveness_passed"]:
            return {
                "success": False,
                "identified": False,
                "liveness_passed": False,
                "liveness": liveness_summary,
                "quality": quality,
                "message": "Anti-spoofing check failed. Please present a live face."
            }

    # Extract embedding
    probe_emb = recognizer.extract_embedding(img, raw_face)

    # 1:N Matching against candidates
    candidate_dicts = [c.dict() for c in payload.candidates]
    threshold = payload.threshold or recognizer.cosine_threshold
    match_result = recognizer.match_1_to_N(probe_emb, candidate_dicts, threshold=threshold)

    elapsed_ms = round((time.time() - start_t) * 1000, 1)

    return {
        "success": True,
        "identified": match_result["matched"],
        "best_match": match_result["best_match"],
        "top_candidate": match_result["top_candidate"],
        "similarity": round(float(match_result["score"]), 4),
        "threshold": threshold,
        "quality_passed": True,
        "quality": quality,
        "liveness_passed": liveness_summary["liveness_passed"] if liveness_summary else True,
        "liveness": liveness_summary,
        "latency_ms": elapsed_ms
    }

@app.post("/api/v1/check-liveness")
def check_liveness_endpoint(payload: LivenessRequest):
    if not payload.frames:
        raise HTTPException(status_code=400, detail="No frames provided")

    frames_data = []
    for f in payload.frames:
        img = decode_base64_image(f)
        faces = detector.detect(img)
        if faces:
            frames_data.append({
                "image_bgr": img,
                "bbox": faces[0]["bbox"],
                "landmarks": faces[0]["landmarks"]
            })

    if not frames_data:
        return {
            "liveness_passed": False,
            "confidence": 0.0,
            "message": "No face found in submitted frames."
        }

    res = liveness_model.evaluate_multi_frame(frames_data)
    return res

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=5050, reload=False, log_level="info")
