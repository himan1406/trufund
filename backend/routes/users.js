const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const {
  getProfile,
  getPublicProfile,
  followUser,
  unfollowUser,
  searchUsers,
  updateProfile,
  uploadProfilePic,
  getFollowing,
  applyVerification,
  getVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getLeaderboardTotal,
  getLeaderboardSingle,
  getAdminPendingCounts,
} = require("../controllers/userController")

const protect = require("../middleware/authMiddleware")

/* ── ENSURE uploads/ EXISTS (safety net) ── */
const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

/* ── MULTER CONFIG ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `profile_${req.user.user_id}_${Date.now()}${ext}`)
  }
})

const ALLOWED_MIMETYPES  = ["image/jpeg", "image/jpg", "image/png"]
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"]

const fileFilter = (req, file, cb) => {
  const ext  = path.extname(file.originalname).toLowerCase()
  const mime = file.mimetype.toLowerCase()

  if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIMETYPES.includes(mime)) {
    cb(null, true)
  } else {
    cb(new Error("Only JPG, JPEG and PNG images are allowed"), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

/* ── MULTER for verification documents ── */
const verifStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `verif_${req.user.user_id}_${Date.now()}_${Math.random().toString(36).slice(2,6)}${ext}`)
  }
})
const VERIF_MIMES = ["image/jpeg","image/jpg","image/png","image/webp","application/pdf"]
const uploadVerif = multer({
  storage: verifStorage,
  fileFilter: (req, file, cb) => {
    VERIF_MIMES.includes(file.mimetype.toLowerCase()) ? cb(null, true)
      : cb(new Error("Only images and PDF documents are allowed"))
  },
  limits: { fileSize: 20 * 1024 * 1024, files: 10 }
})

/* ── ROUTES ── */
router.get("/search",              protect, searchUsers)
router.get("/following",           protect, getFollowing)
router.get("/profile",             protect, getProfile)
router.put("/profile",             protect, updateProfile)

router.post(
  "/profile/picture",
  protect,
  (req, res, next) => {
    upload.single("profile_image")(req, res, (err) => {
      if (err) return next(err)
      next()
    })
  },
  uploadProfilePic
)

router.get("/leaderboard/total",   protect, getLeaderboardTotal)
router.get("/leaderboard/single",  protect, getLeaderboardSingle)

router.get("/admin/pending-counts", protect, getAdminPendingCounts)

router.get("/:username",           protect, getPublicProfile)
router.post("/:username/follow",   protect, followUser)
router.delete("/:username/follow", protect, unfollowUser)

module.exports = router