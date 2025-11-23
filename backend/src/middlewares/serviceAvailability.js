function checkServiceAvailability(req, res, next) {
  const nowET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" })
  );

  const day = nowET.getDay(); // Ethiopia day

  if (day >= 1 && day <= 4) {
    return next(); // allow
  }

  return res.status(403).json({
    message: "Service not available today. We serve Monday–Thursday."
  });
}
module.exports = { checkServiceAvailability };