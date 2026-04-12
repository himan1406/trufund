const express = require("express")
const router = express.Router()

const {
    createOrder,
    verifyPayment,
    getEventDonations,
} = require("../controllers/paymentController")

const protect = require("../middleware/authMiddleware")

router.post("/create-order", protect, createOrder)
router.post("/verify", protect, verifyPayment)
router.get("/donations/:event_id", protect, getEventDonations)

module.exports = router