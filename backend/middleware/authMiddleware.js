const jwt = require("jsonwebtoken")
const pool = require("../config/db")

module.exports = async (req, res, next) => {

  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret")

    /* fetch fresh user data including is_admin flag */
    const result = await pool.query(
      `SELECT user_id, username, is_admin FROM users WHERE user_id = $1`,
      [decoded.user_id]
    )
    if (result.rows.length === 0) return res.status(401).json({ error: "User not found" })

    req.user = {
      user_id: result.rows[0].user_id,
      username: result.rows[0].username,
      is_admin: result.rows[0].is_admin || false,
    }
    next()

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }

}