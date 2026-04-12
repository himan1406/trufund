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
      `SELECT user_id, username, full_name, email, bio, profile_image, show_donation_history, created_at
       FROM users WHERE user_id = $1`,
      [user_id]
    )
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
    const user = userResult.rows[0]

    const followersResult = await pool.query(
      `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`, [user_id]
    )
    const followingResult = await pool.query(
      `SELECT COUNT(*) AS following_count FROM user_follows WHERE follower_id = $1`, [user_id]
    )
    const donationsCountResult = await pool.query(
      `SELECT COUNT(*) AS donations_count FROM donations WHERE donor_id = $1`, [user_id]
    )
    const donationHistoryResult = await pool.query(
      `SELECT d.donation_id, d.amount, d.message, d.donated_at,
              c.title AS campaign_title, c.campaign_id
       FROM donations d JOIN campaigns c ON d.campaign_id = c.campaign_id
       WHERE d.donor_id = $1 ORDER BY d.donated_at DESC`,
      [user_id]
    )

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
  const viewer_id = req.user.user_id

  try {
    const userResult = await pool.query(
      `SELECT user_id, username, full_name, bio, profile_image, show_donation_history, created_at
       FROM users WHERE username = $1`,
      [username]
    )
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
    const user = userResult.rows[0]

    /* own profile — frontend will redirect */
    if (user.user_id === viewer_id) return res.json({ is_own_profile: true })

    const followersResult = await pool.query(
      `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`, [user.user_id]
    )
    const followingResult = await pool.query(
      `SELECT COUNT(*) AS following_count FROM user_follows WHERE follower_id = $1`, [user.user_id]
    )
    const donationsCountResult = await pool.query(
      `SELECT COUNT(*) AS donations_count FROM donations WHERE donor_id = $1`, [user.user_id]
    )
    const isFollowingResult = await pool.query(
      `SELECT follow_id FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [viewer_id, user.user_id]
    )

    let donation_history = []
    if (user.show_donation_history) {
      const dh = await pool.query(
        `SELECT d.donation_id, d.amount, d.message, d.donated_at, c.title AS campaign_title
         FROM donations d JOIN campaigns c ON d.campaign_id = c.campaign_id
         WHERE d.donor_id = $1 ORDER BY d.donated_at DESC`,
        [user.user_id]
      )
      donation_history = dh.rows
    }

    res.json({
      is_own_profile: false,
      user: { ...user, profile_image: user.profile_image || null },
      stats: {
        followers_count: parseInt(followersResult.rows[0].followers_count),
        following_count: parseInt(followingResult.rows[0].following_count),
        donations_count: parseInt(donationsCountResult.rows[0].donations_count),
      },
      is_following: isFollowingResult.rows.length > 0,
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
      `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`, [following_id]
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
      `SELECT COUNT(*) AS followers_count FROM user_follows WHERE following_id = $1`, [following_id]
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
  const { username, bio, current_password, new_password, show_donation_history } = req.body
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

    if (username)                            { fields.push(`username = $${i++}`);                values.push(username) }
    if (bio !== undefined)                   { fields.push(`bio = $${i++}`);                     values.push(bio) }
    if (newHashedPassword)                   { fields.push(`password_hash = $${i++}`);           values.push(newHashedPassword) }
    if (show_donation_history !== undefined) { fields.push(`show_donation_history = $${i++}`);   values.push(show_donation_history) }

    fields.push(`updated_at = $${i++}`)
    values.push(new Date())
    values.push(user_id)

    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE user_id = $${i}`, values)

    const updated = await pool.query(
      "SELECT user_id, username, full_name, email, bio, profile_image, show_donation_history FROM users WHERE user_id = $1",
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

    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`
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