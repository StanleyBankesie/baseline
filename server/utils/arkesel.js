import axios from 'axios';

/**
 * Sends an SMS using the Arkesel V2 API.
 * @param {string} recipient - The phone number to send the SMS to (must include country code, e.g., +233...)
 * @param {string} message - The message body
 * @returns {Promise<boolean>} True if successful
 */
export async function sendArkeselSMS(recipient, message) {
  const apiKey = process.env.ARKESEL_API_KEY;
  const senderId = process.env.ARKESEL_SENDER_ID || 'CHYTA';

  // Make sure recipient has a +
  let formattedRecipient = recipient;
  if (!formattedRecipient.startsWith('+')) {
    formattedRecipient = '+' + formattedRecipient;
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn('[Arkesel] ARKESEL_API_KEY is not set. Simulating SMS sending.');
    console.log(`[Arkesel] To: ${formattedRecipient} | Msg: ${message}`);
    return true; // Simulate success for dev
  }

  try {
    const response = await axios.post(
      'https://sms.arkesel.com/api/v2/sms/send',
      {
        sender: senderId,
        message: message,
        recipients: [formattedRecipient],
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.status === 'success') {
      console.log(`[Arkesel] SMS sent successfully to ${formattedRecipient}`);
      return true;
    } else {
      console.error('[Arkesel] SMS API returned error:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Arkesel] Failed to send SMS:', error.response?.data || error.message);
    return false;
  }
}
