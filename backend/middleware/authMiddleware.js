const jwt = require("jsonwebtoken")

module.exports = (req, res, next) => {

  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret")
    req.user = decoded // { user_id }
    next()

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

}