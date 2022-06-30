const jwt = require("jsonwebtoken");

function validateToken(req, res, next) {
  console.log(req.headers)
  const authHeader = req.headers["authorization"];
  const token = authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.API_SECRET, (err, decoded) => {
    if (err) return res.sendStatus(403);
    req.tokenData = decoded;
    next();
  });
}

module.exports = {validateToken}