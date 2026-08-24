/**
 * @fileoverview AI API Routes for "Banks" AI Assistant.
 * Fully enforces RBAC and user permission propagation.
 */

import express from "express";
import { chatWithBanks, testGroqConnection, setRuntimeApiKey, getApiKey } from "../services/ai/banks.service.js";

const router = express.Router();

// Attach tenant/branch scope
router.use((req, res, next) => {
  req.scope = {
    companyId: req.user?.company_id || req.headers["x-company-id"] || 1,
    branchId: req.user?.branch_id || req.headers["x-branch-id"] || null,
  };
  next();
});

/**
 * POST /api/ai/chat
 * Multi-turn chat with Banks AI with live database tool execution and RBAC security.
 */
router.post("/chat", async (req, res) => {
  try {
    const { messages = [], model, customApiKey, userContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages array is required." });
    }

    // Resolve user context & scope
    const resolvedUserContext = {
      roleName: userContext?.roleName || req.user?.role_name || "User",
      isSuperAdmin: Boolean(
        userContext?.isSuperAdmin ||
        req.user?.id === 1 ||
        (req.user?.permissions && req.user.permissions.includes("*"))
      ),
      allowedModules: Array.isArray(userContext?.allowedModules)
        ? userContext.allowedModules
        : (req.user?.id === 1 ? ["*"] : ["general"]),
    };

    const result = await chatWithBanks(messages, {
      model,
      customApiKey,
      userContext: resolvedUserContext,
      scope: {
        ...req.scope,
        ...resolvedUserContext,
      },
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("[Banks AI Error]:", err?.message);
    res.status(500).json({
      success: false,
      message: err?.message || "Failed to process AI conversation.",
    });
  }
});

/**
 * GET /api/ai/status
 * Check if Groq API is configured and connected.
 */
router.get("/status", async (req, res) => {
  const currentKey = getApiKey();
  const isConfigured = Boolean(currentKey && currentKey.length > 5);
  let maskedKey = "";
  if (isConfigured) {
    maskedKey = currentKey.substring(0, 7) + "..." + currentKey.substring(currentKey.length - 4);
  }

  let connection = { success: false, message: "API key not configured" };
  if (isConfigured) {
    connection = await testGroqConnection(currentKey);
  }

  res.json({
    success: true,
    isConfigured,
    maskedKey,
    connected: connection.success,
    statusMessage: connection.message,
    defaultModel: "openai/gpt-oss-120b",
    availableModels: [
      { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (Best: Deep ERP Reasoning, Complex Analytics & Tools)" },
      { id: "groq/compound", name: "Groq Compound (Multi-Agent Fast Synthesis & Reasoning)" },
      { id: "qwen/qwen3.6-27b", name: "Qwen 3.6 27B (High Capability Enterprise & Code Reasoning)" },
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile (Meta Flagship Enterprise Model)" },
      { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B (High Speed & Accurate Tool Execution)" },
      { id: "groq/compound-mini", name: "Groq Compound Mini (Sub-Second Response Time)" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant (Ultra-Fast Lightweight)" },
      { id: "allam-2-7b", name: "ALLaM 2 7B (Fast Conversational Assistant)" },
      { id: "canopylabs/orpheus-v1-english", name: "Canopy Orpheus v1 (Specialized English Reasoning)" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (32k Extended Context Window)" },
    ],
  });
});

/**
 * POST /api/ai/save-key
 * Validate and save runtime Groq API Key.
 */
router.post("/save-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({ success: false, message: "Valid API key is required." });
    }

    const cleanKey = String(apiKey).trim().replace(/^["']|["']$/g, "").trim();
    const testRes = await testGroqConnection(cleanKey);

    if (!testRes.success) {
      return res.status(400).json({
        success: false,
        message: `Invalid Groq API key: ${testRes.message}`,
      });
    }

    setRuntimeApiKey(cleanKey);
    process.env.GROQ_API_KEY = cleanKey;

    // Persist to .env file
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
      let lines = content.split(/\r?\n/);
      const idx = lines.findIndex((l) => l.startsWith("GROQ_API_KEY="));
      if (idx >= 0) {
        lines[idx] = `GROQ_API_KEY=${cleanKey}`;
      } else {
        lines.push(`GROQ_API_KEY=${cleanKey}`);
      }
      fs.writeFileSync(envPath, lines.join("\n"));
    } catch (e) {
      console.warn("[Banks AI] Could not write to .env:", e.message);
    }

    res.json({
      success: true,
      message: "Groq API key verified and connected successfully!",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/ai/quick-prompts
 * Suggested prompts tailored to OmniSuite ERP.
 */
router.get("/quick-prompts", (req, res) => {
  const prompts = [
    {
      category: "Executive & Revenue",
      title: "Executive Business Summary",
      prompt: "Give me a high-level executive summary of our overall revenue, sales, expenses, and gross profit.",
    },
    {
      category: "Inventory",
      title: "Low Stock & Reorder Analysis",
      prompt: "Check inventory health: which items are below safety reorder level and need urgent replenishment?",
    },
    {
      category: "Production",
      title: "Production Status & Work Orders",
      prompt: "What is our current production status, active work orders, completed units, and machine status?",
    },
    {
      category: "Projects",
      title: "Active Projects & Budgets",
      prompt: "Show me all active projects, their budgets, and expenses incurred so far.",
    },
    {
      category: "POS",
      title: "Retail POS Daily Performance",
      prompt: "How much retail sales have been processed at the POS today, and what are the top selling items?",
    },
    {
      category: "Transport",
      title: "Fleet & Delivery Status",
      prompt: "What is the status of our fleet deliveries and active dispatches?",
    },
    {
      category: "Maintenance",
      title: "Maintenance Job Orders",
      prompt: "Show me open maintenance job orders and equipment requiring attention.",
    },
    {
      category: "Human Resources",
      title: "Workforce Overview",
      prompt: "Give me a breakdown of active workforce headcount across departments.",
    },
  ];

  res.json({ success: true, data: prompts });
});

export default router;
