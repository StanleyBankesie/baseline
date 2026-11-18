/**
 * @file chat.routes.js
 * @description WhatsApp-like Chat Messaging routes powered by Neon PostgreSQL storage.
 * User identity, authentication, permissions, and offline notifications use MySQL.
 * All chat conversations, participants, messages, and presence are stored in Neon PostgreSQL.
 */

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { query as mysqlQuery } from "../db/pool.js";
import { neonQuery } from "../db/neonPool.js";
import {
  requireAuth,
  requireCompanyScope,
  requireBranchScope,
} from "../middleware/auth.js";
import { httpError } from "../utils/httpError.js";
import { io as ioInstance } from "../index.js";
import { isUserOnline } from "../utils/socket.js";
import { sendPushToUser } from "./push.routes.js";
import { uploadBufferToCloudinary } from "../controllers/upload.controller.js";

const router = express.Router();

// Middleware: authentication & multi-company security
router.use(requireAuth, requireCompanyScope, requireBranchScope);

// ============================================
// 👥 USERS FOR RECIPIENT SELECTION
// ============================================

/**
 * GET /users
 * Fetch available users to start a chat with, including live online presence from Neon PostgreSQL.
 */
router.get("/users", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const q = String(req.query?.q || "").trim();
    const params = { me };
    let where = "id <> :me";
    if (q) {
      where += " AND (username LIKE :q OR full_name LIKE :q)";
      params.q = `%${q}%`;
    }

    // Retrieve active users from authoritative MySQL database
    const users =
      (await mysqlQuery(
        `
        SELECT adm_users.id, adm_users.username, adm_users.full_name,
          IF(adm_users.profile_picture IS NULL, NULL,
             IF(LEFT(adm_users.profile_picture, 4) = 'http' OR LEFT(adm_users.profile_picture, 5) = 'data:',
                CONVERT(adm_users.profile_picture USING utf8),
                CONCAT('data:image/jpeg;base64,', REPLACE(TO_BASE64(adm_users.profile_picture), '\\n', '')))) AS profile_picture_url,
          adm_users.created_at
        FROM adm_users
        WHERE ${where}
        ORDER BY adm_users.username ASC
        `,
        params,
      ).catch(() => [])) || [];

    const userIds = users.map((u) => Number(u.id)).filter((n) => Number.isFinite(n));

    // Hydrate presence records from Neon PostgreSQL
    let presenceMap = new Map();
    if (userIds.length > 0) {
      try {
        const presRows = await neonQuery(
          `SELECT user_id, is_online, last_seen FROM chat_presence WHERE user_id = ANY($1::bigint[])`,
          [userIds],
        );
        presenceMap = new Map(presRows.map((r) => [Number(r.user_id), r]));
      } catch (e) {
        console.warn("[Chat:Neon] Could not fetch presence:", e.message);
      }
    }

    res.json({
      items: users.map((u) => {
        const pr = presenceMap.get(Number(u.id));
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          is_online: pr ? Boolean(pr.is_online) : false,
          last_seen: pr?.last_seen || null,
          profile_picture_url: u.profile_picture_url || null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 💬 CONVERSATION MANAGEMENT (NEON POSTGRESQL)
// ============================================

/**
 * GET /conversations
 * Fetch a list of active conversations for the current user within their company scope.
 */
router.get("/conversations", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope.companyId);

    const rows = await neonQuery(
      `
      SELECT c.id,
             c.title,
             (SELECT m.content FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_preview,
             (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_time,
             (SELECT COUNT(*)::int FROM chat_messages m WHERE m.conversation_id = c.id AND m.id > COALESCE(p.last_read_message_id, 0)) AS unread_count
      FROM chat_conversations c
      JOIN chat_conversation_participants p
        ON p.conversation_id = c.id AND p.user_id = $1
      WHERE c.company_id = $2
      ORDER BY (CASE WHEN (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) IS NULL THEN 1 ELSE 0 END),
               (SELECT m.sent_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) DESC,
               c.id DESC
      `,
      [me, companyId],
    );

    res.json({ items: rows || [] });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch conversations:", err.message);
    res.json({ items: [] });
  }
});

/**
 * POST /conversations/direct
 * Create or retrieve an existing direct conversation with another user in the company.
 */
router.post("/conversations/direct", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const companyId = Number(req.scope.companyId);
    const otherId = Number(req.body?.user_id);

    if (!Number.isFinite(otherId) || otherId <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid user_id");
    }

    // Reuse existing direct conversation if one already exists in Neon PostgreSQL
    const existing = await neonQuery(
      `
      SELECT c.id
      FROM chat_conversations c
      JOIN chat_conversation_participants p1 ON p1.conversation_id = c.id AND p1.user_id = $1
      JOIN chat_conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id = $2
      WHERE c.company_id = $3
      LIMIT 1
      `,
      [me, otherId, companyId],
    );

    if (existing && existing.length > 0) {
      return res.json({ id: existing[0].id });
    }

    // Insert new conversation in Neon PostgreSQL
    const convRows = await neonQuery(
      `
      INSERT INTO chat_conversations (company_id, title, created_by, created_at)
      VALUES ($1, NULL, $2, NOW())
      RETURNING id
      `,
      [companyId, me],
    );

    const cid = convRows[0]?.id;

    // Insert both participants
    await neonQuery(
      `
      INSERT INTO chat_conversation_participants (conversation_id, user_id, joined_at, created_by)
      VALUES ($1, $2, NOW(), $4), ($1, $3, NOW(), $4)
      ON CONFLICT (conversation_id, user_id) DO NOTHING
      `,
      [cid, me, otherId, me],
    );

    res.status(201).json({ id: cid });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📩 MESSAGE MANAGEMENT (NEON POSTGRESQL)
// ============================================

/**
 * GET /conversations/:id/messages
 * Fetch all messages within a specific conversation from Neon PostgreSQL.
 */
router.get("/conversations/:id/messages", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    }

    // Security check: verify current user is a participant of this conversation
    const isParticipant = await neonQuery(
      `SELECT 1 FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [id, me],
    );

    if (!isParticipant || isParticipant.length === 0) {
      throw httpError(403, "FORBIDDEN", "Not a participant");
    }

    // Fetch conversation messages from Neon PostgreSQL
    const rows = await neonQuery(
      `
      SELECT id, conversation_id, sender_id, receiver_id, message_type,
             content, file_name, file_size, status, sent_at, delivered_at, read_at, created_by
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY id ASC
      `,
      [id],
    );

    res.json({ items: rows || [] });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch conversations:", err.message);
    res.json({ items: [] });
  }
});

/**
 * POST /messages
 * Send a text or media message to a conversation. Persists permanently to Neon PostgreSQL
 * before emitting real-time WebSocket events or dispatching push notifications.
 */
router.post("/messages", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const {
      conversation_id,
      content,
      message_type = "text",
      file_name = null,
      file_size = null,
    } = req.body || {};

    const cid = Number(conversation_id);
    const type = String(message_type || "text").toLowerCase();
    const isMedia = type !== "text";

    if (!Number.isFinite(cid)) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid conversation_id");
    }
    if (!isMedia && !String(content || "").trim()) {
      throw httpError(400, "VALIDATION_ERROR", "content required for text");
    }

    // Verify participation in Neon PostgreSQL
    const auth = await neonQuery(
      `SELECT 1 FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id = $2 LIMIT 1`,
      [cid, me],
    );
    if (!auth || auth.length === 0) {
      throw httpError(403, "FORBIDDEN", "Not a participant");
    }

    // Resolve receiver for direct chat from Neon PostgreSQL
    const others = await neonQuery(
      `SELECT user_id FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id <> $2 LIMIT 2`,
      [cid, me],
    );
    const receiverId = Number(others?.[0]?.user_id || 0) || null;

    // Permanently persist message to Neon PostgreSQL
    const insRows = await neonQuery(
      `
      INSERT INTO chat_messages (conversation_id, sender_id, receiver_id, message_type, content, file_name, file_size, status, sent_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', NOW(), $8)
      RETURNING id, sent_at
      `,
      [
        cid,
        me,
        receiverId,
        type,
        isMedia ? String(content || "") : String(content).trim(),
        file_name || null,
        file_size == null ? null : Number(file_size),
        me,
      ],
    );

    const mid = insRows[0]?.id;
    const sentAt = insRows[0]?.sent_at || new Date().toISOString();

    // Check delivery status & fetch other participants
    const participants = await neonQuery(
      `SELECT user_id FROM chat_conversation_participants WHERE conversation_id = $1 AND user_id <> $2`,
      [cid, me],
    );
    const otherIds = participants.map((r) => Number(r.user_id)).filter((n) => Number.isFinite(n));

    // Broadcast message via Socket.IO
    const io = ioInstance;
    if (io) {
      const msgPayload = {
        id: mid,
        conversation_id: cid,
        sender_id: me,
        receiver_id: receiverId,
        message_type: type,
        content: String(content || ""),
        file_name: file_name || null,
        file_size: file_size == null ? null : Number(file_size),
        status: "sent",
        sent_at: sentAt,
      };
      // Emit to active conversation room
      io.to(`conv_${cid}`).emit("receive_message", msgPayload);
      // Also emit directly to recipient user room(s) and sender user room
      for (const uid of otherIds) {
        io.to(`user_${uid}`).emit("receive_message", msgPayload);
      }
      io.to(`user_${me}`).emit("receive_message", msgPayload);
    }

    let delivered = false;
    if (receiverId && isUserOnline && (await isUserOnline(receiverId))) {
      await neonQuery(
        `UPDATE chat_messages SET status = 'delivered', delivered_at = NOW() WHERE id = $1`,
        [mid],
      );
      delivered = true;
      if (io) {
        io.to(`conv_${cid}`).emit("message_delivered", { message_id: mid });
      }
    }

    // If offline, queue notification in MySQL adm_notifications and send push
    if (!delivered) {
      const senderRows = await mysqlQuery(
        `SELECT full_name AS name, username FROM adm_users WHERE id = :id LIMIT 1`,
        { id: me },
      ).catch(() => []);
      const title = senderRows?.[0]?.name || senderRows?.[0]?.username || "New message";
      const preview = String(content || "").slice(0, 140);

      for (const uid of otherIds) {
        try {
          await mysqlQuery(
            `
            INSERT INTO adm_notifications (company_id, user_id, title, message, link, is_read)
            VALUES (:companyId, :userId, :title, :message, :link, 0)
            `,
            {
              companyId: req.scope.companyId,
              userId: uid,
              title: `${title}`,
              message: preview,
              link: `/chat?cid=${cid}`,
            },
          ).catch(() => null);

          await sendPushToUser(uid, {
            title: `${title}`,
            body: preview || "New message",
            icon: "/logo.png",
            badge: "/badge.png",
            tag: "chat-message",
            data: { url: `/chat?cid=${cid}`, type: "chat", cid },
          });
        } catch {}
      }
    }

    res.status(201).json({ id: mid, sent_at: sentAt });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📦 MESSAGE STATUS UPDATES (DELIVERED & READ)
// ============================================

/**
 * POST /messages/:id/delivered
 * Mark a specific message as delivered in Neon PostgreSQL.
 */
router.post("/messages/:id/delivered", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "VALIDATION_ERROR");

    await neonQuery(
      `UPDATE chat_messages SET status = 'delivered', delivered_at = NOW() WHERE id = $1 AND status = 'sent'`,
      [id],
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /conversations/:id/read
 * Mark all unread messages in a conversation as read up to the latest message.
 */
router.post("/conversations/:id/read", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw httpError(400, "VALIDATION_ERROR");

    // Retrieve last message id from Neon PostgreSQL
    const rows = await neonQuery(
      `SELECT id FROM chat_messages WHERE conversation_id = $1 ORDER BY id DESC LIMIT 1`,
      [id],
    );
    const lastId = Number(rows?.[0]?.id || 0) || null;

    if (lastId) {
      await neonQuery(
        `UPDATE chat_conversation_participants SET last_read_message_id = $1 WHERE conversation_id = $2 AND user_id = $3`,
        [lastId, id, me],
      );

      await neonQuery(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE conversation_id = $1 
           AND id <= $2 
           AND receiver_id = $3 
           AND status <> 'read'`,
        [id, lastId, me],
      );

      const io = ioInstance;
      if (io) {
        io.to(`conv_${id}`).emit("message_read", {
          conversation_id: id,
          user_id: me,
          last_read_id: lastId,
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ============================================
// 📊 UNREAD COUNTS (NEON POSTGRESQL)
// ============================================

/**
 * GET /unread-count
 * Get total aggregate unread message count for current user across all conversations.
 */
router.get("/unread-count", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);

    const rows = await neonQuery(
      `
      SELECT COALESCE(SUM(unread), 0)::int AS total FROM (
        SELECT COUNT(*) AS unread
        FROM chat_conversations c
        JOIN chat_conversation_participants p
          ON p.conversation_id = c.id AND p.user_id = $1
        JOIN chat_messages m
          ON m.conversation_id = c.id
        WHERE m.id > COALESCE(p.last_read_message_id, 0)
          AND m.sender_id <> $1
      ) t
      `,
      [me],
    );

    res.json({ unread: Number(rows?.[0]?.total || 0) });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch unread count:", err.message);
    res.json({ unread: 0 });
  }
});

/**
 * GET /unread-by-user
 * Get unread message breakdown grouped by sender user id from Neon PostgreSQL.
 */
router.get("/unread-by-user", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);

    const rows = await neonQuery(
      `
      SELECT m.sender_id AS user_id, COUNT(*)::int AS unread
      FROM chat_conversations c
      JOIN chat_conversation_participants p
        ON p.conversation_id = c.id AND p.user_id = $1
      JOIN chat_messages m
        ON m.conversation_id = c.id
      WHERE m.id > COALESCE(p.last_read_message_id, 0)
        AND m.sender_id <> $1
      GROUP BY m.sender_id
      `,
      [me],
    );

    res.json({
      items: rows.map((r) => ({
        user_id: Number(r.user_id),
        unread: Number(r.unread || 0),
      })),
    });
  } catch (err) {
    console.warn("[Chat:Neon] Could not fetch unread by user:", err.message);
    res.json({ items: [] });
  }
});

// ============================================
// 📎 MEDIA UPLOAD (CLOUDINARY / LOCAL FALLBACK)
// ============================================

const chatUploadDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(chatUploadDir)) {
    fs.mkdirSync(chatUploadDir, { recursive: true });
  }
} catch {}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `chat-${unique}${ext}`);
  },
});

const blockedExtensions = new Set([".exe", ".bat", ".cmd", ".sh", ".vbs", ".msi", ".com", ".scr"]);

function chatFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (blockedExtensions.has(ext)) {
    return cb(new Error("Executable and script files are not allowed for security reasons"), false);
  }
  cb(null, true);
}

const chatUpload = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post("/upload", chatUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // 1. Attempt upload to Cloudinary
    try {
      const buffer = fs.readFileSync(req.file.path);
      const companyId = req.user?.company_id || req.user?.companyId || req.scope?.companyId || null;
      const branchId = req.user?.branch_id || req.user?.branchId || req.scope?.branchId || null;

      const cloudResult = await uploadBufferToCloudinary({
        buffer,
        mimetype: req.file.mimetype,
        filename: req.file.originalname || req.file.filename,
        folder: "omnisuite/chat",
        scope: { companyId, branchId },
      });

      if (cloudResult?.url) {
        // Clean up temporary local disk file
        try {
          fs.unlinkSync(req.file.path);
        } catch {}

        return res.json({
          path: cloudResult.url,
          url: cloudResult.url,
          file_name: req.file.originalname || req.file.filename,
          file_size: req.file.size,
          mime: req.file.mimetype,
          public_id: cloudResult.public_id,
          resource_type: cloudResult.resource_type,
          storage: "cloudinary",
        });
      }
    } catch (cloudErr) {
      console.warn("Chat Cloudinary upload warning, falling back to local file storage:", cloudErr.message);
    }

    // 2. Fallback to local server file storage
    const filePath = `/uploads/${req.file.filename}`;
    const origin = `${req.protocol}://${req.get("host")}`;

    res.json({
      path: filePath,
      url: `${origin}${filePath}`,
      file_name: req.file.originalname || req.file.filename,
      file_size: req.file.size,
      mime: req.file.mimetype,
      storage: "local",
    });
  } catch (e) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    next(e);
  }
});

// ============================================
// ⚙️ CHAT USER SETTINGS (WALLPAPER & PREFERENCES)
// ============================================

let userSettingsTableEnsured = false;
async function ensureChatUserSettingsTable() {
  if (userSettingsTableEnsured) return;
  try {
    await neonQuery(`
      CREATE TABLE IF NOT EXISTS chat_user_settings (
        user_id BIGINT PRIMARY KEY,
        background_url TEXT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    userSettingsTableEnsured = true;
  } catch (err) {
    console.error("[Chat:Neon] Failed to ensure chat_user_settings table:", err.message);
  }
}

/**
 * GET /settings
 * Retrieve personal chat settings for the authenticated user.
 */
router.get("/settings", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    await ensureChatUserSettingsTable();
    const rows = await neonQuery(
      `SELECT background_url FROM chat_user_settings WHERE user_id = $1 LIMIT 1`,
      [me],
    );
    res.json({
      background_url: rows?.[0]?.background_url || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /settings
 * Save personal chat settings (e.g. background wallpaper) exclusive to this user.
 */
router.post("/settings", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    const { background_url } = req.body || {};
    await ensureChatUserSettingsTable();
    await neonQuery(
      `
      INSERT INTO chat_user_settings (user_id, background_url, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET background_url = EXCLUDED.background_url, updated_at = NOW()
      `,
      [me, background_url ? String(background_url).trim() : null],
    );
    res.json({
      ok: true,
      background_url: background_url || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /settings/background
 * Remove custom wallpaper and restore to default for the authenticated user.
 */
router.delete("/settings/background", async (req, res, next) => {
  try {
    const me = Number(req.user?.sub || req.user?.id);
    await ensureChatUserSettingsTable();
    await neonQuery(
      `UPDATE chat_user_settings SET background_url = NULL, updated_at = NOW() WHERE user_id = $1`,
      [me],
    );
    res.json({ ok: true, background_url: null });
  } catch (err) {
    next(err);
  }
});

export default router;
