const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const {
  createPost,
  getFeed,
  getUserPosts,
  getHashtagFeed,
  searchHashtags,
  getTrendingHashtags,
  toggleLike,
  deletePost,
  getComments,
  addComment,
  deleteComment,
} = require("../controllers/postController")

const protect = require("../middleware/authMiddleware")

/* ── UPLOADS DIR ── */
const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

/* ── MULTER FOR POSTS (images + videos, up to 10 files) ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `post_${req.user.user_id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`)
  }
})

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"]
const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES]

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype.toLowerCase())) {
    cb(null, true)
  } else {
    cb(new Error("Only JPG, PNG, WebP images and MP4/MOV/WebM videos are allowed"), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file (for videos)
    files: 10,
  }
})

/* ── ROUTES ── */
router.get("/feed",                    protect, getFeed)
router.get("/hashtag/:tag",            protect, getHashtagFeed)
router.get("/search/hashtags",         protect, searchHashtags)
router.get("/trending/hashtags",        protect, getTrendingHashtags)
router.get("/user/:username",          protect, getUserPosts)
router.post("/",                       protect,
  (req, res, next) => {
    upload.array("media", 10)(req, res, (err) => {
      if (err) return next(err)
      next()
    })
  },
  createPost
)
router.post("/:post_id/like",          protect, toggleLike)
router.delete("/:post_id",             protect, deletePost)
router.get("/:post_id/comments",       protect, getComments)
router.post("/:post_id/comments",      protect, addComment)
router.delete("/comments/:comment_id", protect, deleteComment)

module.exports = router