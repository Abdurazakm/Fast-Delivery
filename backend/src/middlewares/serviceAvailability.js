// allow orders only Monday(1) - Thursday(4)
function checkServiceAvailability(req, res, next) {
  const today = new Date().getDay(); // 0=Sun,1=Mon,...6=Sat
  if (today >= 1 && today <= 4) return next();
  return res.status(403).json({
    message: 'Service not available today. We serve Monday–Thursday.'
  });
}

module.exports = checkServiceAvailability;