const axios = require('axios');

const provider = process.env.SMS_PROVIDER || 'none';

async function sendSMS(to, body) {
  if (provider === 'none') {
    console.log('[SMS] mock send to', to, body);
    return { status: 'sent', provider: 'mock', info: { body } };
  }

  if (provider === 'twilio') {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) throw new Error('Twilio config missing');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const data = new URLSearchParams({
      From: from,
      To: to,
      Body: body
    }).toString();

    const auth = { username: sid, password: token };
    try {
      const resp = await axios.post(url, data, {
        auth,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return { status: 'sent', provider: 'twilio', info: resp.data };
    } catch (err) {
      console.error('Twilio error', err?.response?.data || err.message);
      return { status: 'failed', provider: 'twilio', info: err?.response?.data || err.message };
    }
  }

  // Add other providers (Africa's Talking) here...
  return { status: 'failed', provider: 'unknown', info: 'No provider implemented' };
}

module.exports = { sendSMS };
