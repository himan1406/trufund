const express   = require("express")
const router    = express.Router()
const rateLimit = require("express-rate-limit")

const { login, signup, logout } = require("../controllers/authController.js")
const protect = require("../middleware/authMiddleware")

/* Strict rate limit on auth — prevents brute force */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 10,                     // 10 attempts per IP per window
    message: { error: "Too many attempts. Please wait 15 minutes and try again." },
    standardHeaders: true,
    legacyHeaders: false,
})

router.post("/signup", authLimiter, signup)
router.post("/login",  authLimiter, login)
router.post("/logout", protect,     logout)

module.exports = router