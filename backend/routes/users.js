const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")

const { getProfile, updateProfile, uploadProfilePic } = require("../controllers/userController")
const protect = require("../middleware/authMiddleware")

/* ── MULTER CONFIG ── */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/")
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `profile_${req.user.user_id}_${Date.now()}${ext}`)
  }

})

const fileFilter = (req, file, cb) => {
  const allowed = [".jpg", ".jpeg", ".png"]
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error("Only JPG, JPEG and PNG files are allowed"))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

/* ── ROUTES ── */

router.get("/profile", protect, getProfile)
router.put("/profile", protect, updateProfile)
router.post("/profile/picture", protect, upload.single("profile_image"), uploadProfilePic)

module.exports = router