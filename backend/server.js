const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const path = require("path")
const fs = require("fs")

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")
const postRoutes = require("./routes/posts")
const eventRoutes = require("./routes/events")
const paymentRoutes = require("./routes/payment.js")
const notificationRoutes = require("./routes/notifications")
const escrowRoutes = require("./routes/escrow")

const app = express()

/* ── AUTO-CREATE uploads/ folder ── */
const uploadsDir = path.join(__dirname, "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("📁 Created uploads/ directory")
}

/* ── MIDDLEWARE ── */
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

app.use(express.json())
app.use(cookieParser())

/* ── STATIC FILES ── */
app.use("/uploads", express.static(uploadsDir))

/* ── ROUTES ── */
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/events", eventRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/escrow", escrowRoutes)

/* ── GLOBAL ERROR HANDLER (catches multer + other errors) ── */
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Max 5MB for images, 50MB for videos." })
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ error: "Too many files. Maximum 10 per post." })
  }
  if (err.message && (err.message.includes("Only JPG") || err.message.includes("Only"))) {
    return res.status(400).json({ error: err.message })
  }
  if (err.name === "MulterError") {
    return res.status(400).json({ error: `Upload error: ${err.message}` })
  }
  console.error("Server error:", err)
  res.status(500).json({ error: "Internal server error", details: err.message })
})

/* ── AUTO-EXPIRE EVENTS ── */
// Runs every 5 minutes to mark events as 'ended' if their end_date has passed
setInterval(async () => {
  try {
    const pool = require("./config/db")
    const result = await pool.query(
      `UPDATE events 
       SET status = 'ended', updated_at = NOW() 
       WHERE status = 'active' AND end_date < NOW()`
    )
    if (result.rowCount > 0) {
      console.log(`⌛ Auto-expired ${result.rowCount} events`)
    }
  } catch (err) {
    console.error("AUTO-EXPIRE ERROR:", err)
  }
}, 5 * 60 * 1000)

/* ── START ── */
const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 TruFund server running on port ${PORT}`))