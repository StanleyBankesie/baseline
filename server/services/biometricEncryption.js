import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

/**
 * Returns a 32-byte encryption key for AES-256-GCM.
 */
function getMasterKey() {
  const secret = process.env.BIOMETRIC_ENCRYPTION_KEY || process.env.SESSION_SECRET || "omnisuite-biometric-default-vault-key-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a 128-dimensional floating point vector using AES-256-GCM.
 * @param {number[]} embedding - Array of 128 floats
 * @returns {{ encryptedEmbedding: string, iv: string, authTag: string }}
 */
export function encryptEmbedding(embedding) {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Invalid biometric embedding format");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  const jsonStr = JSON.stringify(embedding);
  let encrypted = cipher.update(jsonStr, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encryptedEmbedding: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypts an encrypted embedding string back into an array of floats.
 * @param {string} encryptedHex
 * @param {string} ivHex
 * @param {string} authTagHex
 * @returns {number[]}
 */
export function decryptEmbedding(encryptedHex, ivHex, authTagHex) {
  if (!encryptedHex || !ivHex || !authTagHex) {
    throw new Error("Missing biometric decryption parameters");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted);
}
