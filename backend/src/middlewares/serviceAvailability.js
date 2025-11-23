function checkServiceAvailability(req, res, next) {
  const ethiopiaTime = new Date().toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" });
  const today = new Date(ethiopiaTime).getDay(); // Ethiopia time day
  
  if (today >= 1 && today <= 4) return next();
  
  return res.status(403).json({
    message: "Service not available today. We serve Monday–Thursday."
  });
}
module.exports = { checkServiceAvailability };