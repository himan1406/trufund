const pool = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const isDev = process.env.NODE_ENV !== "production"

/* =========================
   SIGNUP
========================= */
exports.signup = async (req, res) => {
    try {
        const { username, full_name, email, password } = req.body || {}

        if (!username || !full_name || !email || !password) {
            return res.status(400).json({ error: "All fields are required" })
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" })
        }

        /* Check username / email uniqueness before hashing (cheaper) */
        const taken = await pool.query(
            `SELECT user_id FROM users WHERE username = $1 OR email = $2 LIMIT 1`,
            [username, email]
        )
        if (taken.rows.length > 0) {
            return res.status(400).json({ error: "Username or email already in use" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await pool.query(
            `INSERT INTO users (username, full_name, email, password_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING user_id, username, email`,
            [username, full_name, email, hashedPassword]
        )

        if (isDev) console.log("SIGNUP: new user created", user.rows[0].username)

        res.status(201).json({ message: "Signup successful", user: user.rows[0] })
    } catch (err) {
        console.error("SIGNUP ERROR:", err.message)
        res.status(500).json({ error: "Signup failed", details: isDev ? err.message : undefined })
    }
}


/* =========================
   LOGIN
========================= */
exports.login = async (req, res) => {
    try {
        const { email, password, remember } = req.body || {}

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" })
        }

        const userRes = await pool.query(
            "SELECT * FROM users WHERE email = $1", [email]
        )

        /* Use constant-time comparison path to avoid user-enumeration timing attacks */
        const user        = userRes.rows[0]
        const dummyHash   = "$2b$10$invalidhashfortimingprotectiononly000000000000000000000"
        const hashToCheck = user ? user.password_hash : dummyHash

        const valid = await bcrypt.compare(password.trim(), hashToCheck)

        if (!user || !valid) {
            return res.status(401).json({ error: "Invalid email or password" })
        }

        const expiresIn = remember ? "30d" : "1h"
        const maxAge    = remember ? 30 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000

        const token = jwt.sign(
            { user_id: user.user_id },
            process.env.JWT_SECRET,
            { expiresIn }
        )

        const isProd = process.env.NODE_ENV === "production"

        res.cookie("token", token, {
            httpOnly: true,
            secure:   isProd,          // True for https (cloud), false for http (local)
            sameSite: isProd ? "none" : "lax", // Lax is standard for local, None for cross-site
            maxAge,
        })

        if (isDev) console.log("LOGIN: success for", user.username)

        res.json({
            message: "Login successful",
            user: {
                id:       user.user_id,
                username: user.username,
                email:    user.email,
            },
        })
    } catch (err) {
        console.error("LOGIN ERROR:", err)
        res.status(500).json({ 
            error: "Login failed", 
            details: isDev ? err.message : "Internal server error"
        })
    }
}


/* =========================
   LOGOUT
========================= */
exports.logout = async (req, res) => {
    const isProd = process.env.NODE_ENV === "production"
    res.clearCookie("token", {
        httpOnly: true,
        secure:   isProd,
        sameSite: isProd ? "none" : "lax",
    })
    res.json({ message: "Logged out successfully" })
}