const pool = require("../config/db")
const path = require("path")
const fs = require("fs")

/* ─────────────────────────────────────────
   HELPER — get full milestone data
───────────────────────────────────────── */
async function getMilestoneById(milestone_id) {
    const r = await pool.query(
        `SELECT m.*, e.title AS event_title, e.current_amount, e.escrow_balance,
            u.username AS submitted_by_username
     FROM event_milestones m
     JOIN events e ON m.event_id = e.event_id
     LEFT JOIN milestone_proofs p ON p.milestone_id = m.milestone_id AND p.status = 'pending'
     LEFT JOIN users u ON p.submitted_by = u.user_id
     WHERE m.milestone_id = $1
     ORDER BY m.milestone_id DESC
     LIMIT 1`,
        [milestone_id]
    )
    return r.rows[0] || null
}

/* ─────────────────────────────────────────
   SET MILESTONES FOR AN EVENT
   Called when org creates an event — they set 3-5 milestones
   Total percentages must add up to 100
───────────────────────────────────────── */
exports.setMilestones = async (req, res) => {
    const creator_id = req.user.user_id
    const event_id = parseInt(req.params.event_id)
    const { milestones } = req.body
    // milestones = [{ title, description, percentage_amount }, ...]

    if (!milestones || !Array.isArray(milestones) || milestones.length < 2 || milestones.length > 5) {
        return res.status(400).json({ error: "Please provide between 2 and 5 milestones" })
    }

    const total = milestones.reduce((sum, m) => sum + parseFloat(m.percentage_amount || 0), 0)
    if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ error: `Milestone percentages must add up to 100%. Current total: ${total.toFixed(1)}%` })
    }

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        /* verify ownership */
        const eventRes = await client.query(
            `SELECT creator_id FROM events WHERE event_id = $1`, [event_id]
        )
        if (eventRes.rows.length === 0) return res.status(404).json({ error: "Event not found" })
        if (eventRes.rows[0].creator_id !== creator_id) return res.status(403).json({ error: "Not your event" })

        /* always delete and re-insert so milestones can be set even after a failed attempt */
        await client.query(`DELETE FROM event_milestones WHERE event_id = $1`, [event_id])

        /* insert milestones */
        for (let i = 0; i < milestones.length; i++) {
            const m = milestones[i]
            if (!m.title?.trim()) throw new Error(`Milestone ${i + 1} needs a title`)
            await client.query(
                `INSERT INTO event_milestones
          (event_id, title, description, release_order, percentage_amount, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    event_id,
                    m.title.trim(),
                    m.description?.trim() || null,
                    i + 1,
                    parseFloat(m.percentage_amount),
                    i === 0 ? "available" : "locked",  // first milestone unlocked immediately
                ]
            )
        }

        await client.query(
            `UPDATE events SET milestones_set = TRUE, updated_at = NOW() WHERE event_id = $1`, [event_id]
        )

        await client.query("COMMIT")

        const result = await pool.query(
            `SELECT * FROM event_milestones WHERE event_id = $1 ORDER BY release_order ASC`, [event_id]
        )
        res.status(201).json({ message: "Milestones set successfully", milestones: result.rows })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("SET MILESTONES ERROR:", err)
        res.status(500).json({ error: err.message || "Failed to set milestones" })
    } finally {
        client.release()
    }
}


/* ─────────────────────────────────────────
   GET MILESTONES FOR AN EVENT
───────────────────────────────────────── */
exports.getMilestones = async (req, res) => {
    const event_id = parseInt(req.params.event_id)
    try {
        const milestonesRes = await pool.query(
            `SELECT m.*,
              p.proof_id, p.progress_report, p.status AS proof_status,
              p.admin_note, p.submitted_at, p.reviewed_at,
              array_agg(DISTINCT jsonb_build_object('url', pm.media_url, 'type', pm.media_type, 'label', pm.label))
                FILTER (WHERE pm.media_id IS NOT NULL) AS proof_media
       FROM event_milestones m
       LEFT JOIN milestone_proofs p ON p.milestone_id = m.milestone_id
       LEFT JOIN proof_media pm ON pm.proof_id = p.proof_id
       WHERE m.event_id = $1
       GROUP BY m.milestone_id, p.proof_id
       ORDER BY m.release_order ASC`,
            [event_id]
        )

        const eventRes = await pool.query(
            `SELECT escrow_balance, total_released, current_amount FROM events WHERE event_id = $1`, [event_id]
        )

        res.json({
            milestones: milestonesRes.rows,
            escrow_balance: parseFloat(eventRes.rows[0]?.escrow_balance || 0),
            total_released: parseFloat(eventRes.rows[0]?.total_released || 0),
            current_amount: parseFloat(eventRes.rows[0]?.current_amount || 0),
        })
    } catch (err) {
        console.error("GET MILESTONES ERROR:", err)
        res.status(500).json({ error: "Failed to load milestones", details: err.message })
    }
}


/* ─────────────────────────────────────────
   SUBMIT PROOF FOR A MILESTONE
   Org submits photos, bills + written report
───────────────────────────────────────── */
exports.submitProof = async (req, res) => {
    const submitter_id = req.user.user_id
    const milestone_id = parseInt(req.params.milestone_id)
    const { progress_report } = req.body
    const files = req.files || []

    if (!progress_report?.trim()) {
        return res.status(400).json({ error: "A written progress report is required" })
    }

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        /* verify milestone belongs to submitter's event */
        const mRes = await client.query(
            `SELECT m.*, e.creator_id FROM event_milestones m
       JOIN events e ON m.event_id = e.event_id
       WHERE m.milestone_id = $1`,
            [milestone_id]
        )
        if (mRes.rows.length === 0) return res.status(404).json({ error: "Milestone not found" })
        const milestone = mRes.rows[0]

        if (milestone.creator_id !== submitter_id) return res.status(403).json({ error: "Not your event" })
        if (milestone.status !== "available") {
            return res.status(400).json({ error: `Cannot submit proof — milestone is currently "${milestone.status}"` })
        }

        /* check no pending proof already exists */
        const existingProof = await client.query(
            `SELECT proof_id FROM milestone_proofs WHERE milestone_id = $1 AND status = 'pending'`,
            [milestone_id]
        )
        if (existingProof.rows.length > 0) {
            return res.status(400).json({ error: "A proof submission is already pending review for this milestone" })
        }

        /* insert proof */
        const proofRes = await client.query(
            `INSERT INTO milestone_proofs (milestone_id, event_id, submitted_by, progress_report, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING proof_id`,
            [milestone_id, milestone.event_id, submitter_id, progress_report.trim()]
        )
        const proof_id = proofRes.rows[0].proof_id

        /* insert media files */
        for (const file of files) {
            const mediaUrl = `http://localhost:5000/uploads/${file.filename}`
            const mediaType = file.mimetype.startsWith("image") ? "image" : "document"
            const label = file.originalname
            await client.query(
                `INSERT INTO proof_media (proof_id, media_url, media_type, label) VALUES ($1,$2,$3,$4)`,
                [proof_id, mediaUrl, mediaType, label]
            )
        }

        /* update milestone status to submitted */
        await client.query(
            `UPDATE event_milestones SET status = 'submitted', updated_at = NOW() WHERE milestone_id = $1`,
            [milestone_id]
        )

        /* notify all admins */
        const adminsRes = await client.query(`SELECT user_id FROM users WHERE is_admin = TRUE`)
        for (const admin of adminsRes.rows) {
            await client.query(
                `INSERT INTO notifications (user_id, type, title, message, related_id)
         VALUES ($1,'milestone_proof',$2,$3,$4)`,
                [
                    admin.user_id,
                    `Milestone proof submitted`,
                    `An org submitted proof for milestone "${milestone.title}" — awaiting your review.`,
                    milestone.event_id,
                ]
            )
        }

        await client.query("COMMIT")
        res.json({ message: "Proof submitted successfully. Awaiting admin review.", proof_id })
    } catch (err) {
        await client.query("ROLLBACK")
        for (const file of files) {
            const fp = path.join(__dirname, "../uploads", file.filename)
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
        }
        console.error("SUBMIT PROOF ERROR:", err)
        res.status(500).json({ error: "Failed to submit proof", details: err.message })
    } finally {
        client.release()
    }
}


/* ─────────────────────────────────────────
   ADMIN — GET ALL PENDING PROOFS
───────────────────────────────────────── */
exports.getPendingProofs = async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })

    try {
        const result = await pool.query(
            `SELECT p.proof_id, p.milestone_id, p.event_id, p.progress_report,
              p.submitted_at, p.status,
              m.title AS milestone_title, m.release_order, m.percentage_amount,
              e.title AS event_title, e.current_amount, e.escrow_balance,
              u.username AS org_username, u.profile_image AS org_avatar,
              array_agg(
                jsonb_build_object('url', pm.media_url, 'type', pm.media_type, 'label', pm.label)
              ) FILTER (WHERE pm.media_id IS NOT NULL) AS media
       FROM milestone_proofs p
       JOIN event_milestones m ON p.milestone_id = m.milestone_id
       JOIN events e ON p.event_id = e.event_id
       JOIN users u ON p.submitted_by = u.user_id
       LEFT JOIN proof_media pm ON pm.proof_id = p.proof_id
       WHERE p.status = 'pending'
       GROUP BY p.proof_id, m.milestone_id, e.event_id, u.user_id
       ORDER BY p.submitted_at ASC`
        )
        res.json({ proofs: result.rows })
    } catch (err) {
        console.error("GET PENDING PROOFS ERROR:", err)
        res.status(500).json({ error: "Failed to load pending proofs", details: err.message })
    }
}


/* ─────────────────────────────────────────
   ADMIN — APPROVE PROOF → RELEASE FUNDS
───────────────────────────────────────── */
exports.approveProof = async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })

    const admin_id = req.user.user_id
    const proof_id = parseInt(req.params.proof_id)

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        /* get proof + milestone + event */
        const proofRes = await client.query(
            `SELECT p.*, m.percentage_amount, m.release_order, m.event_id,
              m.title AS milestone_title,
              e.current_amount, e.escrow_balance, e.creator_id, e.title AS event_title
       FROM milestone_proofs p
       JOIN event_milestones m ON p.milestone_id = m.milestone_id
       JOIN events e ON m.event_id = e.event_id
       WHERE p.proof_id = $1 AND p.status = 'pending'`,
            [proof_id]
        )
        if (proofRes.rows.length === 0) return res.status(404).json({ error: "Proof not found or already reviewed" })
        const proof = proofRes.rows[0]

        /* calculate release amount */
        const releaseAmount = Math.round(
            (parseFloat(proof.percentage_amount) / 100) * parseFloat(proof.current_amount) * 100
        ) / 100

        /* mark proof as approved */
        await client.query(
            `UPDATE milestone_proofs
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), admin_note = NULL
       WHERE proof_id = $2`,
            [admin_id, proof_id]
        )

        /* mark milestone as approved */
        await client.query(
            `UPDATE event_milestones
       SET status = 'approved', amount_released = $1, updated_at = NOW()
       WHERE milestone_id = $2`,
            [releaseAmount, proof.milestone_id]
        )

        /* update event escrow + released totals */
        await client.query(
            `UPDATE events
       SET escrow_balance = GREATEST(escrow_balance - $1, 0),
           total_released = total_released + $1,
           updated_at = NOW()
       WHERE event_id = $2`,
            [releaseAmount, proof.event_id]
        )

        /* write to escrow ledger */
        const balRes = await client.query(
            `SELECT escrow_balance FROM events WHERE event_id = $1`, [proof.event_id]
        )
        await client.query(
            `INSERT INTO escrow_ledger (event_id, milestone_id, type, amount, balance_after, note)
       VALUES ($1,$2,'release',$3,$4,$5)`,
            [
                proof.event_id,
                proof.milestone_id,
                releaseAmount,
                parseFloat(balRes.rows[0].escrow_balance),
                `Milestone "${proof.milestone_title}" approved — funds released`,
            ]
        )

        /* unlock next milestone (if any) */
        const nextRes = await client.query(
            `SELECT milestone_id FROM event_milestones
       WHERE event_id = $1 AND release_order = $2 AND status = 'locked'`,
            [proof.event_id, proof.release_order + 1]
        )
        if (nextRes.rows.length > 0) {
            await client.query(
                `UPDATE event_milestones SET status = 'available', updated_at = NOW()
         WHERE milestone_id = $1`,
                [nextRes.rows[0].milestone_id]
            )
        }

        /* notify org creator */
        await client.query(
            `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1,'milestone_approved',$2,$3,$4)`,
            [
                proof.creator_id,
                `Milestone approved — ₹${releaseAmount.toLocaleString("en-IN")} released`,
                `Your proof for "${proof.milestone_title}" was approved. Funds have been released to you.`,
                proof.event_id,
            ]
        )

        await client.query("COMMIT")
        res.json({
            message: `Proof approved. ₹${releaseAmount.toLocaleString("en-IN")} released.`,
            amount_released: releaseAmount,
        })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("APPROVE PROOF ERROR:", err)
        res.status(500).json({ error: "Failed to approve proof", details: err.message })
    } finally {
        client.release()
    }
}


/* ─────────────────────────────────────────
   ADMIN — REJECT PROOF
───────────────────────────────────────── */
exports.rejectProof = async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })

    const admin_id = req.user.user_id
    const proof_id = parseInt(req.params.proof_id)
    const { admin_note } = req.body

    if (!admin_note?.trim()) return res.status(400).json({ error: "Please provide a reason for rejection" })

    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const proofRes = await client.query(
            `SELECT p.*, m.milestone_id, m.title AS milestone_title, e.creator_id, e.event_id, e.title AS event_title
       FROM milestone_proofs p
       JOIN event_milestones m ON p.milestone_id = m.milestone_id
       JOIN events e ON m.event_id = e.event_id
       WHERE p.proof_id = $1 AND p.status = 'pending'`,
            [proof_id]
        )
        if (proofRes.rows.length === 0) return res.status(404).json({ error: "Proof not found or already reviewed" })
        const proof = proofRes.rows[0]

        /* mark proof rejected */
        await client.query(
            `UPDATE milestone_proofs
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), admin_note = $2
       WHERE proof_id = $3`,
            [admin_id, admin_note.trim(), proof_id]
        )

        /* revert milestone back to available so org can resubmit */
        await client.query(
            `UPDATE event_milestones SET status = 'available', updated_at = NOW()
       WHERE milestone_id = $1`,
            [proof.milestone_id]
        )

        /* notify org */
        await client.query(
            `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1,'milestone_rejected',$2,$3,$4)`,
            [
                proof.creator_id,
                `Milestone proof rejected`,
                `Your proof for "${proof.milestone_title}" was not approved. Reason: ${admin_note.trim()}`,
                proof.event_id,
            ]
        )

        await client.query("COMMIT")
        res.json({ message: "Proof rejected. Org has been notified and can resubmit." })
    } catch (err) {
        await client.query("ROLLBACK")
        console.error("REJECT PROOF ERROR:", err)
        res.status(500).json({ error: "Failed to reject proof", details: err.message })
    } finally {
        client.release()
    }
}


/* ─────────────────────────────────────────
   GET ESCROW LEDGER FOR AN EVENT
───────────────────────────────────────── */
exports.getEscrowLedger = async (req, res) => {
    const event_id = parseInt(req.params.event_id)
    try {
        const result = await pool.query(
            `SELECT l.*, m.title AS milestone_title
       FROM escrow_ledger l
       LEFT JOIN event_milestones m ON l.milestone_id = m.milestone_id
       WHERE l.event_id = $1
       ORDER BY l.created_at DESC`,
            [event_id]
        )
        res.json({ ledger: result.rows })
    } catch (err) {
        res.status(500).json({ error: "Failed to load ledger" })
    }
}