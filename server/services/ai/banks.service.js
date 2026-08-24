/**
 * @fileoverview Banks AI Agent Service.
 * Connects to Groq Cloud API with robust stream handling,
 * candidate model auto-negotiation, and full RBAC permission enforcement.
 */

import { BANKS_TOOLS, executeTool } from "./banks.tools.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_URL = "https://api.groq.com/openai/v1/models";

const CANDIDATE_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "groq/compound",
];

let activeWorkingModel = "openai/gpt-oss-120b";
let runtimeApiKey = process.env.GROQ_API_KEY || "";

export function setRuntimeApiKey(key) {
  runtimeApiKey = String(key || "").trim().replace(/^["']|["']$/g, "").trim();
}

export function getApiKey() {
  return runtimeApiKey || process.env.GROQ_API_KEY || "";
}

/**
 * System prompt builder with strict RBAC rules and concise greeting behavior.
 */
function buildSystemPrompt(userContext = {}) {
  const { roleName = "User", allowedModules = ["*"], isSuperAdmin = false } = userContext;
  const isFullAccess = isSuperAdmin || (Array.isArray(allowedModules) && allowedModules.includes("*"));

  const rbacRules = isFullAccess
    ? "USER ACCESS LEVEL: Super Administrator (Full access across all ERP modules and records)."
    : `STRICT RBAC & PERMISSION RULES:
- User Role: "${roleName}"
- User's Permitted ERP Modules: [${allowedModules.join(", ")}]
- RESTRICTION: The user ONLY has permission to access data and workflows for their permitted modules listed above.
- If the user asks about, queries metrics for, or requests information regarding ANY module or page not in their allowed list (for example, asking about salaries/staff when lacking HR access, or asking about financial revenues when lacking Sales/Finance access), you MUST refuse politely by stating:
  "You do not have permission to access the [Module Name] module in OmniSuite ERP. Please contact your system administrator to request access."
- Never disclose data or execute actions for unauthorized modules.`;

  return `You are "Banks", the enterprise AI Assistant for OmniSuite ERP.

CONVERSATION & GREETING RULES:
1. Keep greetings and conversational pleasantries extremely brief. When the user says "hi", "hello", or similar greetings, respond with a single, short polite sentence such as: "Hello! How can I help you today?"
2. Do NOT list every single module or add long repetitive paragraphs during casual greetings.

${rbacRules}

CORE GUIDELINES:
1. When asked about authorized business performance, revenue, inventory, stock, projects, work orders, employees, maintenance, or logistics, ALWAYS call the corresponding tool to retrieve live database facts before responding.
2. Format financial figures clearly using Ghana Cedis (GH₵ / GHS) with comma grouping (e.g., GH₵ 8,684.26).
3. Structure your responses professionally with clean Markdown tables and bullet points.
4. Maintain a confident, friendly, executive, and highly helpful tone.`;
}

/**
 * Helper to execute a single POST request to Groq and safely parse the response text.
 */
async function callGroqChat(apiKey, payload) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsedData = null;
  try {
    parsedData = JSON.parse(rawText);
  } catch {
    parsedData = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    rawText,
    data: parsedData,
  };
}

/**
 * Send a chat message to Banks AI with automated multi-turn tool calling.
 *
 * @param {Array<{role: string, content: string}>} messages Conversation history
 * @param {object} options Context options (scope, model, customApiKey, userContext)
 * @returns {Promise<{reply: string, toolCallsExecuted: Array<object>, model: string}>}
 */
export async function chatWithBanks(messages = [], options = {}) {
  const rawKey = options.customApiKey || getApiKey();

  if (!rawKey) {
    throw new Error(
      "Groq API Key is not configured. Please configure your GROQ_API_KEY in System Configuration -> General Settings."
    );
  }

  const apiKey = String(rawKey).trim().replace(/^["']|["']$/g, "").trim();
  let model = options.model || activeWorkingModel;
  const toolCallsExecuted = [];

  const systemPromptText = buildSystemPrompt(options.userContext || options.scope || {});

  // Build full message thread with dynamic RBAC system prompt
  const fullMessages = [
    { role: "system", content: systemPromptText },
    ...messages.map((m) => ({
      role: m.role === "user" || m.role === "assistant" || m.role === "system" || m.role === "tool" ? m.role : "user",
      content: m.content || "",
      ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
      ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
    })),
  ];

  let currentMessages = [...fullMessages];
  let maxTurns = 6;

  while (maxTurns > 0) {
    maxTurns--;

    const payload = {
      model,
      messages: currentMessages,
      tools: BANKS_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 2048,
    };

    let result = await callGroqChat(apiKey, payload);

    // If model not found or unavailable, automatically cycle candidate models
    if (!result.ok) {
      const isModelNotFound =
        result.data?.error?.code === "model_not_found" ||
        result.data?.error?.message?.includes("does not exist") ||
        result.rawText?.includes("model_not_found");

      if (isModelNotFound) {
        let found = false;
        for (const candidate of CANDIDATE_MODELS) {
          if (candidate === model) continue;
          payload.model = candidate;
          const retryRes = await callGroqChat(apiKey, payload);
          if (retryRes.ok) {
            result = retryRes;
            model = candidate;
            activeWorkingModel = candidate;
            found = true;
            break;
          }
        }
        if (!found) {
          const errMsg = result.data?.error?.message || result.rawText || "Model unavailable";
          throw new Error(`Groq API Error (${result.status}): ${errMsg}`);
        }
      } else {
        const errMsg = result.data?.error?.message || result.rawText || "Request failed";
        throw new Error(`Groq API Error (${result.status}): ${errMsg}`);
      }
    }

    const message = result.data?.choices?.[0]?.message;
    if (!message) {
      throw new Error("No response returned from AI engine.");
    }

    // Check if model called one or more tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      currentMessages.push(message);

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function?.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          fnArgs = {};
        }

        // Execute ERP tool query with RBAC scope
        const toolResult = await executeTool(fnName, fnArgs, options.scope || options.userContext || {});
        toolCallsExecuted.push({
          toolName: fnName,
          arguments: fnArgs,
          result: toolResult,
        });

        // Add tool result to conversation context
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Loop back to synthesize tool results into final executive answer
      continue;
    }

    // Finished synthesis
    return {
      reply: message.content || "",
      toolCallsExecuted,
      model,
      usage: result.data?.usage || null,
    };
  }

  throw new Error("Maximum AI reasoning iterations reached without concluding.");
}

/**
 * Test Groq API key connectivity by calling the /models endpoint.
 */
export async function testGroqConnection(apiKey) {
  const rawKey = apiKey || getApiKey();
  if (!rawKey) return { success: false, message: "No API key provided" };
  const key = String(rawKey).trim().replace(/^["']|["']$/g, "").trim();

  try {
    const res = await fetch(GROQ_MODELS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });

    const rawText = await res.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {}

    if (!res.ok) {
      const errorMsg = data?.error?.message || rawText;
      return { success: false, message: errorMsg };
    }

    const modelIds = (data?.data || []).map((m) => m.id);

    return {
      success: true,
      message: "Connected to Groq Cloud successfully!",
      models: modelIds,
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
