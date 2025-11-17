const axios = require("axios");

const provider = process.env.SMS_PROVIDER || "mobilesmsapi";

async function sendSMS(to, body) {
  if (provider === "none") {
    console.log("[SMS MOCK] ->", to, body);
    return { status: "sent", provider: "mock", info: { body } };
  }

  if (provider === "twilio") {
    const sid = process.env.TWILIO_SID;
    const token = process.env.TWILIO_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!sid || !token || !messagingServiceSid) {
      throw new Error("Twilio config missing in .env");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const data = new URLSearchParams({
      To: to,
      Body: body,
      MessagingServiceSid: messagingServiceSid,
    }).toString();

    try {
      const resp = await axios.post(url, data, {
        auth: { username: sid, password: token },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      console.log("Twilio SMS Sent:", resp.data.sid);

      return {
        status: "sent",
        provider: "twilio",
        info: resp.data,
      };

    } catch (err) {
      console.error("❌ Twilio SMS Error:", err?.response?.data || err.message);
      return {
        status: "failed",
        provider: "twilio",
        info: err?.response?.data || err.message,
      };
    }
  }else if (provider === "mobilesmsapi") {

  const apiKey = process.env.MOBILESMS_API_KEY;
  if (!apiKey) {
    throw new Error("MobileSMS API key missing in .env");
  }

  // CORRECT WORKING ENDPOINT
  const baseUrl = "https://api.smsmobileapi.com/sendsms";


    recipients= to
    message= body


  const url = `${baseUrl}?apikey=${apiKey}&recipients=${recipients}&message=${message}`;

  try {
    const resp = await axios.get(url);

    console.log("MobileSMS API Sent:", resp.data);

    return {
      status: "sent",
      provider: "mobilesmsapi",
      info: resp.data, // contains GUID
    };

  } catch (err) {
    console.error(
      "❌ MobileSMS API Error:",
      err?.response?.data || err.message
    );

    return {
      status: "failed",
      provider: "mobilesmsapi",
      info: err?.response?.data || err.message,
    };
  }
}



  return {
    status: "failed",
    provider: "unknown",
    info: "No provider implemented",
  };
}

module.exports = { sendSMS };
