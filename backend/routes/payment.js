const express    = require("express")
const router     = express.Router()
const rateLimit  = require("express-rate-limit")

const {
    createOrder,
    verifyPayment,
    razorpayWebhook,
    refundDonation,
    getEventDonations,
} = require("../controllers/paymentController")

const protect = require("../middleware/authMiddleware")

/* ── Rate limiter for payment endpoints ── */
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 20,
    message: { error: "Too many payment requests. Please wait a moment and try again." },
    standardHeaders: true,
    legacyHeaders: false,
})

/*
 * IMPORTANT: The webhook route must use express.raw() to get the raw body
 * for HMAC signature verification. This route must be registered BEFORE
 * any express.json() middleware applies to this router.
 *
 * In your main app.js / server.js, register this route like this:
 *
 *   app.use("/api/payment/webhook",
 *       express.raw({ type: "application/json" }),
 *       require("./routes/payment").webhookRouter
 *   )
 *   app.use("/api/payment", require("./routes/payment").router)
 *
 * OR simply keep it here and handle raw body in the controller (already done).
 */

/* ── Routes ── */
router.post("/create-order",              protect, paymentLimiter, createOrder)
router.post("/verify",                    protect, paymentLimiter, verifyPayment)
router.get("/donations/:event_id",        protect, getEventDonations)
router.post("/refund/:donation_id",       protect, refundDonation)

/*
 * Webhook — NO auth middleware (Razorpay calls this server-to-server).
 * Signature verification happens inside the controller.
 * Register with express.raw() in app.js for correct body parsing — see note above.
 */
router.post("/webhook", razorpayWebhook)

module.exports = router