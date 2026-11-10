/**
 * Client service to communicate with the Python / FastAPI Facial Recognition Microservice.
 */

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || "http://127.0.0.1:5050";

async function postJson(endpoint, data, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${FACE_SERVICE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const err = new Error(errBody.detail || errBody.message || `Face service returned ${res.status}`);
      err.status = res.status;
      err.details = errBody;
      throw err;
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error(`Facial recognition microservice request timed out after ${timeoutMs}ms`);
    }
    if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
      throw new Error("Facial recognition microservice is offline or unreachable at " + FACE_SERVICE_URL);
    }
    throw err;
  }
}

export async function checkFaceServiceHealth() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${FACE_SERVICE_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { online: false, status: res.status };
    const data = await res.json();
    return { online: true, ...data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Extracts 128-D embedding, checks image quality and liveness on a single image.
 */
export async function extractEmbedding(imageBase64, { checkLiveness = true, livenessThreshold = 0.85 } = {}) {
  return await postJson("/api/v1/extract-embedding", {
    image: imageBase64,
    check_liveness: checkLiveness,
    liveness_threshold: livenessThreshold,
  });
}

/**
 * Verifies a probe image against an enrolled 128-D vector (1:1).
 */
export async function verifyMatch(probeImageBase64, enrolledEmbedding, { threshold = 0.38, checkLiveness = true } = {}) {
  return await postJson("/api/v1/verify-match", {
    probe_image: probeImageBase64,
    enrolled_embedding: enrolledEmbedding,
    threshold,
    check_liveness: checkLiveness,
  });
}

/**
 * Identifies a face against a list of enrolled candidate employees (1:N).
 */
export async function identifyEmployee(
  probeImageBase64,
  candidates,
  { additionalFrames = [], threshold = 0.38, checkLiveness = true, livenessThreshold = 0.85 } = {}
) {
  return await postJson(
    "/api/v1/identify",
    {
      probe_image: probeImageBase64,
      additional_frames: additionalFrames,
      candidates,
      threshold,
      check_liveness: checkLiveness,
      liveness_threshold: livenessThreshold,
    },
    12000
  );
}

/**
 * Checks liveness across a series of frames.
 */
export async function checkLiveness(frames, { threshold = 0.85 } = {}) {
  return await postJson("/api/v1/check-liveness", {
    frames,
    threshold,
  });
}
