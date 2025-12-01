// Allow orders only Monday–Thursday AND before 6:00 PM (EAT = 3:00 PM UTC)
function checkServiceAvailability(req, res, next) {
  const now = new Date();

  // --- DAY CHECK (keep as is) ---
  const today = now.getDay(); // 0=Sun,1=Mon,...6=Sat
  const isWorkingDay = today >= 1 && today <= 4;

  if (!isWorkingDay) {
    return res.status(403).json({
      message: "Service not available today. We serve Only Monday–Thursday."
    });
  }

  // --- TIME CHECK (server uses UTC) ---
  const hrs = now.getHours(); // UTC hours
  const mins = now.getMinutes();

  // EAT 6:00 PM == 18:00 local = 15:00 UTC
  if (hrs > 15 || (hrs === 15 && mins > 0)) {
    return res.status(403).json({
      message: "Service is closed for today. We accept orders before 6:00 PM."
    });
  }

  return next();
}

module.exports = checkServiceAvailability;