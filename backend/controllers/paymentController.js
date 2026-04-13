const Razorpay = require("razorpay")
const crypto = require("crypto")
const pool = require("../config/db")

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

/* ─────────────────────────────────────────
   HELPER — shared logic for recording a verified donation
   Used by both /verify (frontend) and /webhook (Razorpay server)
───────────────────────────────────────── */
async function recordDonation({ event_id, donor_id, amount, is_anonymous, message, payment_id }) {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const donationAmount = parseFloat(amount)

        /* INSERT — skip silently if this payment_id already processed */
        const insertRes = await client.query(
            `INSERT INTO event_donations
                (event_id, donor_id, amount, currency, is_anonymous, message, stripe_payment_intent_id, status)
             VALUES ($1, $2, $3, 'inr', $4, $5, $6, 'completed')
             ON CONFLICT (stripe_payment_intent_id) DO NOTHING
             RETURNING donation_id`,
            [
                parseInt(event_id),
                donor_id,
                donationAmount,
                is_anonymous === true || is_anonymous === "true",
                message || null,
                payment_id,
            ]
        )

        /* If rowCount is 0 this payment was already recorded — bail out cleanly */
        if (insertRes.rowCount === 0) {
            await client.query("ROLLBACK")
            return { duplicate: true }
        }

        /* Update event totals + auto-complete if goal reached */
        await client.query(
            `UPDATE events
             SET current_amount = current_amount + $1,
                 escrow_balance = escrow_balance + $1,
                 updated_at     = NOW(),
                 status = CASE
                     WHEN current_amount + $1 >= goal_amount THEN 'completed'
                     ELSE status
                 END
             WHERE event_id = $2`,
            [donationAmount, parseInt(event_id)]
        )

        /* Write to escrow ledger */
        const balRes = await client.query(
            `SELECT escrow_balance FROM events WHERE event_id = $1`, [parseInt(event_id)]
        )
        const newBalance = parseFloat(balRes.rows[0].escrow_balance)

        await client.query(
            `INSERT INTO escrow_ledger (event_id, type, amount, balance_after, note)
             VALUES ($1, 'donation', $2, $3, $4)`,
            [
                parseInt(event_id),
                donationAmount,
                newBalance,
                `Donation via Razorpay — ${is_anonymous === "true" || is_anonymous === true ? "Anonymous" : "Donor #" + donor_id}`,
            ]
        )

        /* Notify event creator */
        const eventRes = await client.query(
            `SELECT creator_id, title FROM events WHERE event_id = $1`, [parseInt(event_id)]
        )
        if (eventRes.rows.length > 0) {
            const { creator_id, title } = eventRes.rows[0]
            let donorName = "Someone"
            if (!(is_anonymous === true || is_anonymous === "true") && donor_id) {
                const donorRes = await client.query(
                    `SELECT username FROM users WHERE user_id = $1`, [donor_id]
                )
                donorName = donorRes.rows[0]?.username || "Someone"
            }
            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
                 VALUES ($1, 'new_donation', $2, $3, $4)`,
                [
                    creator_id,
                    `New donation on "${title}"`,
                    `${donorName} donated ₹${donationAmount.toFixed(2)} to your event.`,
                    parseInt(event_id),
                ]
            )
        }

        await client.query("COMMIT")
        return { duplicate: false, newBalance }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}


/* =========================
   CREATE ORDER
========================= */
exports.createOrder = async (req, res) => {
    const donor_id = req.user.user_id
    const { event_id, amount, is_anonymous = false, message = "" } = req.body

    if (!event_id || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) < 1) {
        return res.status(400).json({ error: "A valid event and amount (min ₹1) are required" })
    }

    try {
        const eventRes = await pool.query(
            `SELECT event_id, title, status FROM events WHERE event_id = $1`, [event_id]
        )
        if (eventRes.rows.length === 0) return res.status(404).json({ error: "Event not found" })
        if (eventRes.rows[0].status !== "active") {
            return res.status(400).json({ error: "This event is no longer accepting donations" })
        }

        const amountPaise = Math.round(parseFloat(amount) * 100)

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: `rcpt_${event_id}_${donor_id}_${Date.now()}`,
            notes: {
                event_id:     String(event_id),
                donor_id:     String(donor_id),
                is_anonymous: String(is_anonymous),
                message:      message || "",
            },
        })

        res.json({
            order_id:    order.id,
            amount:      amountPaise,
            currency:    "INR",
            key_id:      process.env.RAZORPAY_KEY_ID,
            event_title: eventRes.rows[0].title,
        })
    } catch (err) {
        console.error("CREATE ORDER ERROR:", err)
        res.status(500).json({ error: "Failed to create payment order", details: err.message })
    }
}


/* =========================
   VERIFY PAYMENT  (called by frontend after Razorpay checkout)
========================= */
exports.verifyPayment = async (req, res) => {
    const donor_id = req.user.user_id
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        event_id,
        amount,
        is_anonymous = false,
        message = "",
    } = req.body

    /* 1 — Verify Razorpay HMAC signature */
    const body     = razorpay_order_id + "|" + razorpay_payment_id
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex")

    if (expected !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed — invalid signature" })
    }

    try {
        const result = await recordDonation({
            event_id,
            donor_id,
            amount,
            is_anonymous,
            message,
            payment_id: razorpay_payment_id,
        })

        if (result.duplicate) {
            // Already processed (e.g. webhook beat the frontend) — still return success
            const ev = await pool.query(
                `SELECT current_amount, goal_amount, escrow_balance, total_released, status
                 FROM events WHERE event_id = $1`, [parseInt(event_id)]
            )
            return res.json({ success: true, duplicate: true, ...formatEventState(ev.rows[0]) })
        }

        const ev = await pool.query(
            `SELECT current_amount, goal_amount, escrow_balance, total_released, status
             FROM events WHERE event_id = $1`, [parseInt(event_id)]
        )
        res.json({ success: true, ...formatEventState(ev.rows[0]) })
    } catch (err) {
        console.error("VERIFY PAYMENT ERROR:", err)
        res.status(500).json({ error: "Failed to record donation", details: err.message })
    }
}


/* =========================
   RAZORPAY WEBHOOK  (server-to-server — handles missed frontend verifications)
   Add route:  POST /api/payment/webhook  (NO auth middleware, raw body)
========================= */
exports.razorpayWebhook = async (req, res) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
        console.error("RAZORPAY_WEBHOOK_SECRET not set — ignoring webhook")
        return res.status(500).send("Webhook secret not configured")
    }

    /* Verify webhook signature */
    const signature = req.headers["x-razorpay-signature"]
    const body      = typeof req.body === "string" ? req.body : JSON.stringify(req.body)
    const expected  = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex")

    if (expected !== signature) {
        console.warn("WEBHOOK: Invalid signature — rejected")
        return res.status(400).send("Invalid signature")
    }

    const event   = typeof req.body === "string" ? JSON.parse(req.body) : req.body
    const payload = event?.payload?.payment?.entity

    /* Only handle successful captures */
    if (event.event !== "payment.captured" || !payload) {
        return res.status(200).send("OK")
    }

    const { id: payment_id, notes } = payload
    const { event_id, donor_id, is_anonymous, message } = notes || {}
    const amount = payload.amount / 100   // paise → rupees

    if (!event_id || !amount) {
        console.warn("WEBHOOK: Missing event_id or amount in notes — skipping", notes)
        return res.status(200).send("OK")
    }

    try {
        const result = await recordDonation({
            event_id,
            donor_id: donor_id ? parseInt(donor_id) : null,
            amount,
            is_anonymous,
            message,
            payment_id,
        })
        if (result.duplicate) {
            console.log(`WEBHOOK: payment ${payment_id} already recorded — skipped`)
        } else {
            console.log(`WEBHOOK: payment ${payment_id} recorded — ₹${amount}`)
        }
        res.status(200).send("OK")
    } catch (err) {
        console.error("WEBHOOK ERROR:", err)
        /* Return 200 so Razorpay doesn't keep retrying for a bug on our side */
        res.status(200).send("OK")
    }
}


/* =========================
   REFUND DONATION
   Admin or event creator can trigger a refund for a specific donation
========================= */
exports.refundDonation = async (req, res) => {
    const { donation_id } = req.params
    const requester_id    = req.user.user_id
    const is_admin        = req.user.is_admin

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        /* Fetch donation */
        const donRes = await client.query(
            `SELECT ed.*, e.creator_id, e.escrow_balance, e.title AS event_title
             FROM event_donations ed
             JOIN events e ON ed.event_id = e.event_id
             WHERE ed.donation_id = $1`,
            [donation_id]
        )
        if (donRes.rows.length === 0) return res.status(404).json({ error: "Donation not found" })
        const donation = donRes.rows[0]

        /* Only admin or event creator can refund */
        if (!is_admin && donation.creator_id !== requester_id) {
            return res.status(403).json({ error: "Not authorised to refund this donation" })
        }
        if (donation.status !== "completed") {
            return res.status(400).json({ error: "Only completed donations can be refunded" })
        }
        if (!donation.stripe_payment_intent_id) {
            return res.status(400).json({ error: "No payment ID on record — cannot refund" })
        }

        const refundAmount = Math.round(parseFloat(donation.amount) * 100) // paise

        /* Call Razorpay refund API */
        const refund = await razorpay.payments.refund(donation.stripe_payment_intent_id, {
            amount: refundAmount,
            notes:  { reason: "Event refund", donation_id: String(donation.donation_id) },
        })

        /* Mark donation as refunded */
        await client.query(
            `UPDATE event_donations SET status = 'refunded' WHERE donation_id = $1`,
            [donation_id]
        )

        /* Subtract from event totals */
        const donAmt = parseFloat(donation.amount)
        await client.query(
            `UPDATE events
             SET current_amount = GREATEST(current_amount - $1, 0),
                 escrow_balance = GREATEST(escrow_balance - $1, 0),
                 updated_at = NOW()
             WHERE event_id = $2`,
            [donAmt, donation.event_id]
        )

        /* Write to escrow ledger */
        const balRes = await client.query(
            `SELECT escrow_balance FROM events WHERE event_id = $1`, [donation.event_id]
        )
        await client.query(
            `INSERT INTO escrow_ledger (event_id, type, amount, balance_after, note)
             VALUES ($1, 'refund', $2, $3, $4)`,
            [
                donation.event_id,
                donAmt,
                parseFloat(balRes.rows[0].escrow_balance),
                `Refund issued — Razorpay refund ID: ${refund.id}`,
            ]
        )

        /* Notify donor */
        await client.query(
            `INSERT INTO notifications (user_id, type, title, message, related_id)
             VALUES ($1, 'donation_refunded', $2, $3, $4)`,
            [
                donation.donor_id,
                `Your donation has been refunded`,
                `Your ₹${donAmt.toFixed(2)} donation to "${donation.event_title}" has been refunded.`,
                donation.event_id,
            ]
        )

        await client.query("COMMIT")
        res.json({ message: "Refund issued successfully", refund_id: refund.id, amount: donAmt })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("REFUND ERROR:", err)
        res.status(500).json({ error: "Refund failed", details: err.message })
    } finally {
        client.release()
    }
}


/* =========================
   GET DONATION FEED FOR EVENT
========================= */
exports.getEventDonations = async (req, res) => {
    const event_id = parseInt(req.params.event_id)
    try {
        const result = await pool.query(
            `SELECT ed.donation_id, ed.amount, ed.is_anonymous, ed.message, ed.donated_at, ed.status,
                    CASE WHEN ed.is_anonymous THEN NULL ELSE u.username END AS username
             FROM event_donations ed
             LEFT JOIN users u ON ed.donor_id = u.user_id
             WHERE ed.event_id = $1 AND ed.status = 'completed'
             ORDER BY ed.donated_at DESC LIMIT 50`,
            [event_id]
        )
        res.json({ donations: result.rows })
    } catch (err) {
        res.status(500).json({ error: "Failed to load donations" })
    }
}


/* ─────────────────────────────────────────
   INTERNAL HELPER
───────────────────────────────────────── */
function formatEventState(ev) {
    const progress = ev.goal_amount > 0
        ? Math.min(100, Math.round((parseFloat(ev.current_amount) / parseFloat(ev.goal_amount)) * 100))
        : 0
    return {
        current_amount:  parseFloat(ev.current_amount),
        goal_amount:     parseFloat(ev.goal_amount),
        escrow_balance:  parseFloat(ev.escrow_balance),
        total_released:  parseFloat(ev.total_released),
        progress,
        status: ev.status,
    }
}