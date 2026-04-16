const pool = require("../config/db")
const bcrypt = require("bcrypt")
const path = require("path")
const fs = require("fs")

/* =========================
   GET OWN PROFILE
========================= */
exports.getProfile = async (req, res) => {
    const user_id = req.user.user_id
    try {
        const userResult = await pool.query(
            `SELECT user_id, username, full_name, email, bio, profile_image,
                    show_donation_history, is_admin, is_verified_org, verification_status, created_at,
                    bank_account_name, bank_account_num, bank_ifsc
             FROM users WHERE user_id = $1`,
            [user_id]
        )
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
        const user = userResult.rows[0]

        const [followersResult, followingResult, donationsCountResult, donationHistoryResult] =
            await Promise.all([
                pool.query(
                    `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`,
                    [user_id]
                ),
                pool.query(
                    `SELECT COUNT(*) AS following_count FROM user_follows WHERE follower_id = $1`,
                    [user_id]
                ),
                /* FIX: query event_donations, not the non-existent donations table */
                pool.query(
                    `SELECT COUNT(*) AS donations_count FROM event_donations
                     WHERE donor_id = $1 AND status = 'completed'`,
                    [user_id]
                ),
                /* FIX: join event_donations → events (no campaigns table needed) */
                pool.query(
                    `SELECT ed.donation_id, ed.amount, ed.message, ed.donated_at,
                            e.title AS event_title, e.event_id
                     FROM event_donations ed
                     JOIN events e ON ed.event_id = e.event_id
                     WHERE ed.donor_id = $1 AND ed.status = 'completed'
                     ORDER BY ed.donated_at DESC`,
                    [user_id]
                ),
            ])

        res.json({
            user: { ...user, profile_image: user.profile_image || null },
            stats: {
                followers_count: parseInt(followersResult.rows[0].followers_count),
                following_count: parseInt(followingResult.rows[0].following_count),
                donations_count: parseInt(donationsCountResult.rows[0].donations_count),
            },
            donation_history: donationHistoryResult.rows,
        })
    } catch (err) {
        console.error("GET PROFILE ERROR:", err)
        res.status(500).json({ error: "Failed to load profile", details: err.message })
    }
}


/* =========================
   GET PUBLIC PROFILE BY USERNAME
========================= */
exports.getPublicProfile = async (req, res) => {
    const { username } = req.params
    const viewer_id    = req.user.user_id

    try {
        const userResult = await pool.query(
            `SELECT user_id, username, full_name, bio, profile_image,
                    show_donation_history, is_admin, is_verified_org, created_at
             FROM users WHERE username = $1`,
            [username]
        )
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
        const user = userResult.rows[0]

        if (user.user_id === viewer_id) return res.json({ is_own_profile: true })

        const [followersResult, followingResult, donationsCountResult, isFollowingResult] =
            await Promise.all([
                pool.query(
                    `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`,
                    [user.user_id]
                ),
                pool.query(
                    `SELECT COUNT(*) AS following_count FROM user_follows WHERE follower_id = $1`,
                    [user.user_id]
                ),
                pool.query(
                    `SELECT COUNT(*) AS donations_count FROM event_donations
                     WHERE donor_id = $1 AND status = 'completed'`,
                    [user.user_id]
                ),
                pool.query(
                    `SELECT follow_id FROM user_follows
                     WHERE follower_id = $1 AND following_id = $2`,
                    [viewer_id, user.user_id]
                ),
            ])

        let donation_history = []
        if (user.show_donation_history) {
            const dh = await pool.query(
                `SELECT ed.donation_id, ed.amount, ed.message, ed.donated_at,
                        e.title AS event_title, e.event_id
                 FROM event_donations ed
                 JOIN events e ON ed.event_id = e.event_id
                 WHERE ed.donor_id = $1 AND ed.status = 'completed'
                 ORDER BY ed.donated_at DESC`,
                [user.user_id]
            )
            donation_history = dh.rows
        }

        res.json({
            is_own_profile: false,
            user:           { ...user, profile_image: user.profile_image || null },
            stats: {
                followers_count: parseInt(followersResult.rows[0].followers_count),
                following_count: parseInt(followingResult.rows[0].following_count),
                donations_count: parseInt(donationsCountResult.rows[0].donations_count),
            },
            is_following:    isFollowingResult.rows.length > 0,
            donation_history,
        })
    } catch (err) {
        console.error("GET PUBLIC PROFILE ERROR:", err)
        res.status(500).json({ error: "Failed to load profile", details: err.message })
    }
}


/* =========================
   FOLLOW USER
========================= */
exports.followUser = async (req, res) => {
    const follower_id = req.user.user_id
    const { username } = req.params
    try {
        const target = await pool.query(`SELECT user_id FROM users WHERE username = $1`, [username])
        if (target.rows.length === 0) return res.status(404).json({ error: "User not found" })
        const following_id = target.rows[0].user_id

        if (follower_id === following_id) return res.status(400).json({ error: "Cannot follow yourself" })

        await pool.query(
            `INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [follower_id, following_id]
        )
        const countResult = await pool.query(
            `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`,
            [following_id]
        )
        res.json({ message: "Followed", followers_count: parseInt(countResult.rows[0].followers_count) })
    } catch (err) {
        console.error("FOLLOW ERROR:", err)
        res.status(500).json({ error: "Failed to follow", details: err.message })
    }
}


/* =========================
   UNFOLLOW USER
========================= */
exports.unfollowUser = async (req, res) => {
    const follower_id = req.user.user_id
    const { username } = req.params
    try {
        const target = await pool.query(`SELECT user_id FROM users WHERE username = $1`, [username])
        if (target.rows.length === 0) return res.status(404).json({ error: "User not found" })
        const following_id = target.rows[0].user_id

        await pool.query(
            `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
            [follower_id, following_id]
        )
        const countResult = await pool.query(
            `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`,
            [following_id]
        )
        res.json({ message: "Unfollowed", followers_count: parseInt(countResult.rows[0].followers_count) })
    } catch (err) {
        console.error("UNFOLLOW ERROR:", err)
        res.status(500).json({ error: "Failed to unfollow", details: err.message })
    }
}


/* =========================
   SEARCH USERS
========================= */
exports.searchUsers = async (req, res) => {
    const { q } = req.query
    const viewer_id = req.user.user_id
    if (!q || q.trim().length < 1) return res.json({ users: [] })
    try {
        const result = await pool.query(
            `SELECT user_id, username, full_name, profile_image
             FROM users
             WHERE (username ILIKE $1 OR full_name ILIKE $1) AND user_id != $2
             LIMIT 8`,
            [`%${q.trim()}%`, viewer_id]
        )
        res.json({ users: result.rows })
    } catch (err) {
        console.error("SEARCH ERROR:", err)
        res.status(500).json({ error: "Search failed", details: err.message })
    }
}


/* =========================
   UPDATE PROFILE
========================= */
exports.updateProfile = async (req, res) => {
    const user_id = req.user.user_id
    const { username, bio, current_password, new_password, show_donation_history, bank_account_name, bank_account_num, bank_ifsc } = req.body
    try {
        const userResult = await pool.query("SELECT * FROM users WHERE user_id = $1", [user_id])
        if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
        const user = userResult.rows[0]

        if (username && username !== user.username) {
            const taken = await pool.query(
                "SELECT user_id FROM users WHERE username = $1 AND user_id != $2", [username, user_id]
            )
            if (taken.rows.length > 0) return res.status(400).json({ error: "Username is already taken" })
        }

        let newHashedPassword = null
        if (new_password) {
            if (!current_password) return res.status(400).json({ error: "Current password is required" })
            const valid = await bcrypt.compare(current_password, user.password_hash)
            if (!valid) return res.status(401).json({ error: "Current password is incorrect" })
            if (new_password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" })
            newHashedPassword = await bcrypt.hash(new_password, 10)
        }

        const fields = []
        const values = []
        let i = 1

        if (username)                            { fields.push(`username = $${i++}`);              values.push(username) }
        if (bio !== undefined)                   { fields.push(`bio = $${i++}`);                   values.push(bio) }
        if (newHashedPassword)                   { fields.push(`password_hash = $${i++}`);         values.push(newHashedPassword) }
        if (show_donation_history !== undefined) { fields.push(`show_donation_history = $${i++}`); values.push(show_donation_history) }
        if (bank_account_name !== undefined)     { fields.push(`bank_account_name = $${i++}`);     values.push(bank_account_name) }
        if (bank_account_num !== undefined)      { fields.push(`bank_account_num = $${i++}`);      values.push(bank_account_num) }
        if (bank_ifsc !== undefined)             { fields.push(`bank_ifsc = $${i++}`);             values.push(bank_ifsc) }

        fields.push(`updated_at = $${i++}`)
        values.push(new Date())
        values.push(user_id)

        await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE user_id = $${i}`, values)

        const updated = await pool.query(
            "SELECT user_id, username, full_name, email, bio, profile_image, show_donation_history, bank_account_name, bank_account_num, bank_ifsc FROM users WHERE user_id = $1",
            [user_id]
        )
        res.json({ message: "Profile updated successfully", user: updated.rows[0] })
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err)
        res.status(500).json({ error: "Failed to update profile", details: err.message })
    }
}


/* =========================
   UPLOAD PROFILE PICTURE
========================= */
exports.uploadProfilePic = async (req, res) => {
    const user_id = req.user.user_id
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" })

        const userResult = await pool.query("SELECT profile_image FROM users WHERE user_id = $1", [user_id])
        const oldImage = userResult.rows[0]?.profile_image
        if (oldImage && oldImage.includes("/uploads/")) {
            const oldPath = path.join(__dirname, "../uploads/", path.basename(oldImage))
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
        }

        const imageUrl = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${req.file.filename}`
        await pool.query(
            "UPDATE users SET profile_image = $1, updated_at = $2 WHERE user_id = $3",
            [imageUrl, new Date(), user_id]
        )
        res.json({ message: "Profile picture updated", profile_image: imageUrl })
    } catch (err) {
        console.error("UPLOAD PIC ERROR:", err)
        res.status(500).json({ error: "Failed to upload picture", details: err.message })
    }
}


/* =========================
   GET FOLLOWING LIST
========================= */
exports.getFollowing = async (req, res) => {
    const user_id = req.user.user_id
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.username, u.full_name, u.profile_image
             FROM user_follows uf
             JOIN users u ON uf.following_id = u.user_id
             WHERE uf.follower_id = $1
             ORDER BY uf.followed_at DESC`,
            [user_id]
        )
        res.json({ following: result.rows })
    } catch (err) {
        console.error("GET FOLLOWING ERROR:", err)
        res.status(500).json({ error: "Failed to load following list", details: err.message })
    }
}

/* =========================
   APPLY FOR ORG VERIFICATION
========================= */
exports.applyVerification = async (req, res) => {
  const user_id = req.user.user_id
  const { org_name, org_description, website_url } = req.body
  const files = req.files || []

  if (!org_name?.trim()) return res.status(400).json({ error: "Organisation name is required" })

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    /* check not already pending/approved */
    const existing = await client.query(
      `SELECT verification_id, status FROM org_verifications
       WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`, [user_id]
    )
    if (existing.rows.length > 0) {
      const { status } = existing.rows[0]
      if (status === "pending")  return res.status(400).json({ error: "You already have a pending verification application" })
      if (status === "approved") return res.status(400).json({ error: "Your organisation is already verified" })
    }

    /* check user not already verified */
    const userCheck = await client.query(`SELECT is_verified_org FROM users WHERE user_id = $1`, [user_id])
    if (userCheck.rows[0]?.is_verified_org) return res.status(400).json({ error: "Already verified" })

    const verifRes = await client.query(
      `INSERT INTO org_verifications (user_id, org_name, org_description, website_url, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING verification_id`,
      [user_id, org_name.trim(), org_description?.trim() || null, website_url?.trim() || null]
    )
    const verification_id = verifRes.rows[0].verification_id

    /* insert documents */
    for (const file of files) {
      const docUrl  = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${file.filename}`
      const docType = file.mimetype.startsWith("image") ? "image" : "document"
      await client.query(
        `INSERT INTO verification_documents (verification_id, doc_url, doc_type, label)
         VALUES ($1, $2, $3, $4)`,
        [verification_id, docUrl, docType, file.originalname]
      )
    }

    /* update user verification_status */
    await client.query(
      `UPDATE users SET verification_status = 'pending' WHERE user_id = $1`, [user_id]
    )

    /* notify all admins */
    const admins = await client.query(`SELECT user_id FROM users WHERE is_admin = TRUE`)
    for (const admin of admins.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id)
         VALUES ($1, 'verification_request', $2, $3, $4)`,
        [admin.user_id, `New org verification request`,
         `${org_name.trim()} has applied for verified status. Review in Admin Panel.`,
         user_id]
      )
    }

    await client.query("COMMIT")
    res.status(201).json({ message: "Verification application submitted. We'll review it shortly." })
  } catch (err) {
    await client.query("ROLLBACK")
    const fs = require("fs"), path = require("path")
    for (const file of files) {
      const fp = path.join(__dirname, "../uploads", file.filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    console.error("APPLY VERIFICATION ERROR:", err)
    res.status(500).json({ error: "Failed to submit application", details: err.message })
  } finally { client.release() }
}


/* =========================
   GET OWN VERIFICATION STATUS
========================= */
exports.getVerificationStatus = async (req, res) => {
  const user_id = req.user.user_id
  try {
    const result = await pool.query(
      `SELECT v.verification_id, v.org_name, v.org_description, v.website_url,
              v.status, v.admin_note, v.submitted_at, v.reviewed_at,
              array_agg(jsonb_build_object('url', d.doc_url, 'type', d.doc_type, 'label', d.label))
                FILTER (WHERE d.doc_id IS NOT NULL) AS documents
       FROM org_verifications v
       LEFT JOIN verification_documents d ON d.verification_id = v.verification_id
       WHERE v.user_id = $1
       GROUP BY v.verification_id
       ORDER BY v.submitted_at DESC LIMIT 1`,
      [user_id]
    )
    const userRes = await pool.query(
      `SELECT is_verified_org, verification_status FROM users WHERE user_id = $1`, [user_id]
    )
    res.json({
      application:         result.rows[0] || null,
      is_verified_org:     userRes.rows[0]?.is_verified_org || false,
      verification_status: userRes.rows[0]?.verification_status || "none",
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to load verification status" })
  }
}


/* =========================
   ADMIN — GET ALL PENDING VERIFICATIONS
========================= */
exports.getPendingVerifications = async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })
  try {
    const result = await pool.query(
      `SELECT v.verification_id, v.org_name, v.org_description, v.website_url,
              v.status, v.submitted_at,
              u.user_id, u.username, u.profile_image,
              array_agg(jsonb_build_object('url', d.doc_url, 'type', d.doc_type, 'label', d.label))
                FILTER (WHERE d.doc_id IS NOT NULL) AS documents
       FROM org_verifications v
       JOIN users u ON v.user_id = u.user_id
       LEFT JOIN verification_documents d ON d.verification_id = v.verification_id
       WHERE v.status = 'pending'
       GROUP BY v.verification_id, u.user_id
       ORDER BY v.submitted_at ASC`
    )
    res.json({ verifications: result.rows })
  } catch (err) {
    console.error("GET PENDING VERIFICATIONS ERROR:", err)
    res.status(500).json({ error: "Failed to load verifications" })
  }
}


/* =========================
   ADMIN — APPROVE VERIFICATION
========================= */
exports.approveVerification = async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })
  const admin_id        = req.user.user_id
  const verification_id = parseInt(req.params.verification_id)

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const verifRes = await client.query(
      `SELECT v.*, u.username FROM org_verifications v
       JOIN users u ON v.user_id = u.user_id
       WHERE v.verification_id = $1 AND v.status = 'pending'`, [verification_id]
    )
    if (verifRes.rows.length === 0) return res.status(404).json({ error: "Application not found or already reviewed" })
    const verif = verifRes.rows[0]

    await client.query(
      `UPDATE org_verifications SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE verification_id = $2`, [admin_id, verification_id]
    )
    await client.query(
      `UPDATE users SET is_verified_org = TRUE, verification_status = 'approved'
       WHERE user_id = $1`, [verif.user_id]
    )
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1, 'verification_approved', $2, $3, $4)`,
      [verif.user_id, "Your organisation has been verified! ✅",
       "Congratulations! Your TruFund verification has been approved. A verified badge will now appear on your profile.",
       verif.user_id]
    )

    await client.query("COMMIT")
    res.json({ message: `@${verif.username} is now verified.` })
  } catch (err) {
    await client.query("ROLLBACK")
    res.status(500).json({ error: "Failed to approve verification", details: err.message })
  } finally { client.release() }
}


/* =========================
   ADMIN — REJECT VERIFICATION
========================= */
exports.rejectVerification = async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })
  const admin_id        = req.user.user_id
  const verification_id = parseInt(req.params.verification_id)
  const { admin_note }  = req.body

  if (!admin_note?.trim()) return res.status(400).json({ error: "A rejection reason is required" })

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const verifRes = await client.query(
      `SELECT v.*, u.username FROM org_verifications v
       JOIN users u ON v.user_id = u.user_id
       WHERE v.verification_id = $1 AND v.status = 'pending'`, [verification_id]
    )
    if (verifRes.rows.length === 0) return res.status(404).json({ error: "Application not found or already reviewed" })
    const verif = verifRes.rows[0]

    await client.query(
      `UPDATE org_verifications SET status = 'rejected', admin_note = $1,
       reviewed_by = $2, reviewed_at = NOW() WHERE verification_id = $3`,
      [admin_note.trim(), admin_id, verification_id]
    )
    await client.query(
      `UPDATE users SET verification_status = 'rejected' WHERE user_id = $1`, [verif.user_id]
    )
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1, 'verification_rejected', $2, $3, $4)`,
      [verif.user_id, "Verification application not approved",
       `Your verification was not approved. Reason: ${admin_note.trim()}`,
       verif.user_id]
    )

    await client.query("COMMIT")
    res.json({ message: "Verification rejected." })
  } catch (err) {
    await client.query("ROLLBACK")
    res.status(500).json({ error: "Failed to reject verification", details: err.message })
  } finally { client.release() }
}

/* =========================
   GET LEADERBOARD: TOTAL DONATED
   ========================= */
exports.getLeaderboardTotal = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.username, u.profile_image, 
                    SUM(ed.amount) as total_donated, 
                    COUNT(ed.donation_id) as donation_count
             FROM users u
             JOIN event_donations ed ON u.user_id = ed.donor_id
             WHERE ed.status = 'completed'
             GROUP BY u.user_id, u.username, u.profile_image
             ORDER BY total_donated DESC
             LIMIT 50`
        )
        res.json({ leaderboard: result.rows })
    } catch (err) {
        console.error("LEADERBOARD TOTAL ERROR:", err)
        res.status(500).json({ error: "Failed to load leaderboard" })
    }
}

/* =========================
   GET LEADERBOARD: SINGLE BIGGEST GIFT
   ========================= */
exports.getLeaderboardSingle = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.user_id, u.username, u.profile_image, 
                    MAX(ed.amount) as max_donation,
                    (SELECT title FROM events WHERE event_id = (SELECT event_id FROM event_donations WHERE donor_id = u.user_id AND amount = MAX(ed.amount) LIMIT 1)) as event_title
             FROM users u
             JOIN event_donations ed ON u.user_id = ed.donor_id
             WHERE ed.status = 'completed'
             GROUP BY u.user_id, u.username, u.profile_image
             ORDER BY max_donation DESC
             LIMIT 50`
        )
        res.json({ leaderboard: result.rows })
    } catch (err) {
        console.error("LEADERBOARD SINGLE ERROR:", err)
        res.status(500).json({ error: "Failed to load leaderboard" })
    }
}

/* =========================
   ADMIN — GET PENDING COUNTS
========================= */
exports.getAdminPendingCounts = async (req, res) => {
    if (!req.user.is_admin) return res.status(403).json({ error: "Admin access required" })
    try {
        const verifRes = await pool.query(`SELECT COUNT(*) FROM org_verifications WHERE status = 'pending'`)
        const proofsRes = await pool.query(`SELECT COUNT(*) FROM milestone_proofs WHERE status = 'pending'`)
        
        res.json({
            pending_verifications: parseInt(verifRes.rows[0].count),
            pending_proofs: parseInt(proofsRes.rows[0].count)
        })
    } catch (err) {
        console.error("ADMIN COUNTS ERROR:", err)
        res.status(500).json({ error: "Failed to load admin counts" })
    }
}