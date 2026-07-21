// Use native fetch (Node 18+)
const _fetch = global.fetch;

export const isWhatsAppConfigured = () => {
  return !!process.env.WASENDER_API_TOKEN;
};

export const sendWhatsApp = async ({ to, message }) => {
  if (!isWhatsAppConfigured()) {
    console.log(`[MOCK WHATSAPP] To: ${to} | Message: ${message}`);
    return;
  }

  try {
    const apiUrl = process.env.WHATSAPP_API_URL || "https://api.wasender.io/send"; // Adjust default URL if needed, or leave dynamic.
    const apiToken = process.env.WASENDER_API_TOKEN;

    // Remove any non-numeric characters from the phone number
    const cleanNumber = to.replace(/\D/g, "");

    // wasenderapi.com payload structure
    const response = await _fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        number: cleanNumber,
        type: "text",
        message: message
      }),
    });

    const data = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      throw new Error(`WhatsApp API Error: ${data.message || data.error || response.statusText}`);
    }

    console.log(`[WHATSAPP] Sent successfully to ${cleanNumber}`);
    return data;
  } catch (error) {
    console.error("[WHATSAPP ERROR]", error.message);
    throw error;
  }
};
