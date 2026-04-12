const Razorpay = require("razorpay")
const crypto = require("crypto")
const pool = require("../config/db")

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
})

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
            receipt: `receipt_${event_id}_${donor_id}_${Date.now()}`,
            notes: {
                event_id: String(event_id),
                donor_id: String(donor_id),
                is_anonymous: String(is_anonymous),
                message: message || "",
            },
        })

        res.json({
            order_id: order.id,
            amount: amountPaise,
            currency: "INR",
            key_id: process.env.RAZORPAY_KEY_ID,
            event_title: eventRes.rows[0].title,
        })
    } catch (err) {
        console.error("CREATE ORDER ERROR:", err)
        res.status(500).json({ error: "Failed to create payment order", details: err.message })
    }
}


/* =========================
   VERIFY PAYMENT
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

    /* verify Razorpay signature */
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest("hex")

    if (expected !== razorpay_signature) {
        return res.status(400).json({ error: "Payment verification failed — invalid signature" })
    }

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const donationAmount = parseFloat(amount)

        /* record donation */
        await client.query(
            `INSERT INTO event_donations
        (event_id, donor_id, amount, currency, is_anonymous, message, stripe_payment_intent_id, status)
       VALUES ($1,$2,$3,'inr',$4,$5,$6,'completed')
       ON CONFLICT (stripe_payment_intent_id) DO NOTHING`,
            [
                parseInt(event_id), donor_id, donationAmount,
                is_anonymous === true || is_anonymous === "true",
                message || null,
                razorpay_payment_id,
            ]
        )

        /* update event current_amount and escrow_balance */
        await client.query(
            `UPDATE events
       SET current_amount  = current_amount + $1,
           escrow_balance  = escrow_balance + $1,
           updated_at      = NOW(),
           status = CASE
             WHEN current_amount + $1 >= goal_amount THEN 'completed'
             ELSE status
           END
       WHERE event_id = $2`,
            [donationAmount, parseInt(event_id)]
        )

        /* write donation to escrow ledger */
        const balRes = await client.query(
            `SELECT escrow_balance FROM events WHERE event_id = $1`, [parseInt(event_id)]
        )
        await client.query(
            `INSERT INTO escrow_ledger (event_id, type, amount, balance_after, note)
       VALUES ($1, 'donation', $2, $3, $4)`,
            [
                parseInt(event_id),
                donationAmount,
                parseFloat(balRes.rows[0].escrow_balance),
                `Donation received via Razorpay — ${is_anonymous === "true" ? "Anonymous" : "Donor #" + donor_id}`,
            ]
        )

        /* notify event creator */
        const eventRes = await client.query(
            `SELECT creator_id, title FROM events WHERE event_id = $1`, [parseInt(event_id)]
        )
        if (eventRes.rows.length > 0) {
            const { creator_id, title } = eventRes.rows[0]
            const donorRes = await client.query(
                `SELECT username FROM users WHERE user_id = $1`, [donor_id]
            )
            const donorName = (is_anonymous === true || is_anonymous === "true")
                ? "Someone"
                : (donorRes.rows[0]?.username || "Someone")

            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
         VALUES ($1,'new_donation',$2,$3,$4)`,
                [
                    creator_id,
                    `New donation on "${title}"`,
                    `${donorName} donated ₹${donationAmount.toFixed(2)} to your event.`,
                    parseInt(event_id),
                ]
            )
        }

        await client.query("COMMIT")

        /* return updated event state */
        const updatedEvent = await pool.query(
            `SELECT current_amount, goal_amount, escrow_balance, total_released, status FROM events WHERE event_id = $1`,
            [parseInt(event_id)]
        )
        const ev = updatedEvent.rows[0]
        const progress = ev.goal_amount > 0
            ? Math.min(100, Math.round((parseFloat(ev.current_amount) / parseFloat(ev.goal_amount)) * 100))
            : 0

        res.json({
            success: true,
            current_amount: parseFloat(ev.current_amount),
            goal_amount: parseFloat(ev.goal_amount),
            escrow_balance: parseFloat(ev.escrow_balance),
            total_released: parseFloat(ev.total_released),
            progress,
            status: ev.status,
        })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("VERIFY PAYMENT ERROR:", err)
        res.status(500).json({ error: "Failed to record donation", details: err.message })
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
            `SELECT ed.donation_id, ed.amount, ed.is_anonymous, ed.message, ed.donated_at,
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