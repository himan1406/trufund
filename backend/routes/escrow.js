const express = require("express")
const router = express.Router()
const multer = require("multer")
const path = require("path")
const fs = require("fs")

const {
    setMilestones,
    getMilestones,
    submitProof,
    getPendingProofs,
    approveProof,
    rejectProof,
    getEscrowLedger,
} = require("../controllers/escrowController")

const protect = require("../middleware/authMiddleware")

/* ── MULTER for proof uploads ── */
const uploadsDir = path.join(__dirname, "../uploads")
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase()
        cb(null, `proof_${req.user.user_id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`)
    }
})

const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        ALLOWED.includes(file.mimetype.toLowerCase())
            ? cb(null, true)
            : cb(new Error("Only images and PDF documents are allowed for proof"))
    },
    limits: { fileSize: 20 * 1024 * 1024, files: 10 }
})

/* ── ROUTES ── */

/* Org — set milestones for their event */
router.post("/events/:event_id/milestones", protect, setMilestones)

/* Anyone — view milestones for an event */
router.get("/events/:event_id/milestones", protect, getMilestones)

/* Org — submit proof for a milestone */
router.post("/milestones/:milestone_id/proof", protect,
    (req, res, next) => {
        upload.array("proof_files", 10)(req, res, err => { if (err) return next(err); next() })
    },
    submitProof
)

/* Admin — get all pending proofs */
router.get("/admin/proofs/pending", protect, getPendingProofs)

/* Admin — approve or reject a proof */
router.post("/admin/proofs/:proof_id/approve", protect, approveProof)
router.post("/admin/proofs/:proof_id/reject", protect, rejectProof)

/* Anyone — view escrow ledger for an event */
router.get("/events/:event_id/ledger", protect, getEscrowLedger)

module.exports = router