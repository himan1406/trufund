const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const {
    createEvent, getEvents, getEvent, getMyEvents, deleteEvent
} = require("../controllers/eventController")

const protect = require("../middleware/authMiddleware")

/* ── MULTER ── */
const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `event_${req.user.user_id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`)
    }
})

const ALLOWED_MIMES = [
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "video/mp4", "video/quicktime", "video/webm"
]

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        ALLOWED_MIMES.includes(file.mimetype.toLowerCase())
            ? cb(null, true)
            : cb(new Error("Only images and videos are allowed"))
    },
    limits: { fileSize: 50 * 1024 * 1024, files: 10 }
})

/* ── ROUTES ── */
router.get("/", protect, getEvents)
router.get("/mine", protect, getMyEvents)
router.get("/:event_id", protect, getEvent)
router.post("/", protect,
    (req, res, next) => {
        upload.array("media", 10)(req, res, err => { if (err) return next(err); next() })
    },
    createEvent
)
router.delete("/:event_id", protect, deleteEvent)

module.exports = router