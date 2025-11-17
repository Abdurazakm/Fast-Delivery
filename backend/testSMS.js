// testSMS.js
require('dotenv').config();
const { sendSMS } = require('./src/services/smsService'); // <- use ./src/services

(async () => {
  const resp = await sendSMS('+251954724664', 'Test message from Fast Delivery');
  console.log(resp);
})();
