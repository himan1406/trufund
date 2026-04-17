const pool = require("../config/db")
const path = require("path")
const fs   = require("fs")

/* ── HELPERS ── */
async function getEventById(event_id, viewer_id) {
  const eventRes = await pool.query(
    `SELECT e.*, u.username, u.profile_image, u.full_name
     FROM events e
     JOIN users u ON e.creator_id = u.user_id
     WHERE e.event_id = $1`,
    [event_id]
  )
  if (eventRes.rows.length === 0) return null
  const ev = eventRes.rows[0]

  const mediaRes = await pool.query(
    `SELECT media_url, media_type, position FROM event_media
     WHERE event_id = $1 ORDER BY position ASC`,
    [event_id]
  )

  const donationsRes = await pool.query(
    `SELECT ed.donation_id, ed.amount, ed.is_anonymous, ed.message,
            ed.donated_at,
            CASE WHEN ed.is_anonymous THEN NULL ELSE u.username END AS username
     FROM event_donations ed
     LEFT JOIN users u ON ed.donor_id = u.user_id
     WHERE ed.event_id = $1 AND ed.status = 'completed'
     ORDER BY ed.donated_at DESC
     LIMIT 50`,
    [event_id]
  )

  const progress = ev.goal_amount > 0
    ? Math.min(100, Math.round((parseFloat(ev.current_amount) / parseFloat(ev.goal_amount)) * 100))
    : 0

  return {
    event_id:       ev.event_id,
    title:          ev.title,
    description:    ev.description,
    category:       ev.category,
    goal_amount:    parseFloat(ev.goal_amount),
    current_amount: parseFloat(ev.current_amount),
    progress,
    status:         ev.status,
    start_date:     ev.start_date,
    end_date:       ev.end_date,
    cover_image:    ev.cover_image,
    created_at:     ev.created_at,
    creator: {
      user_id:       ev.creator_id,
      username:      ev.username,
      full_name:     ev.full_name,
      profile_image: ev.profile_image,
    },
    media:     mediaRes.rows,
    donations: donationsRes.rows,
  }
}


/* =========================
   CREATE EVENT
========================= */
exports.createEvent = async (req, res) => {
  const creator_id = req.user.user_id
  const { title, description, category, goal_amount, start_date, end_date } = req.body
  const files = req.files || []

  if (!title?.trim())   return res.status(400).json({ error: "Title is required" })
  if (!goal_amount || isNaN(parseFloat(goal_amount)) || parseFloat(goal_amount) <= 0) {
    return res.status(400).json({ error: "A valid donation goal is required" })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    /* pick first image as cover */
    let cover_image = null
    if (files.length > 0) {
      cover_image = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${files[0].filename}`
    }

    const eventRes = await client.query(
      `INSERT INTO events
        (creator_id, title, description, category, goal_amount, start_date, end_date, cover_image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING event_id`,
      [creator_id, title.trim(), description?.trim() || null,
       category?.trim() || null, parseFloat(goal_amount),
       start_date || null, end_date || null, cover_image]
    )
    const event_id = eventRes.rows[0].event_id

    /* insert all media */
    for (let i = 0; i < files.length; i++) {
      const mediaUrl  = `${process.env.BASE_URL || "http://localhost:5000"}/uploads/${files[i].filename}`
      const mediaType = files[i].mimetype.startsWith("video") ? "video" : "image"
      await client.query(
        `INSERT INTO event_media (event_id, media_url, media_type, position)
         VALUES ($1,$2,$3,$4)`,
        [event_id, mediaUrl, mediaType, i]
      )
    }

    /* notify all followers of this creator */
    const creatorRes = await client.query(
      `SELECT username FROM users WHERE user_id = $1`, [creator_id]
    )
    const creatorUsername = creatorRes.rows[0]?.username || "Someone you follow"

    const followersRes = await client.query(
      `SELECT follower_id FROM user_follows WHERE following_id = $1`,
      [creator_id]
    )
    for (const row of followersRes.rows) {
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id)
         VALUES ($1, 'new_event', $2, $3, $4)`,
        [
          row.follower_id,
          `New event from @${creatorUsername}: ${title.trim()}`,
          `@${creatorUsername} just posted a new event. Tap to view and donate.`,
          event_id,
        ]
      )
    }

    await client.query("COMMIT")
    const fullEvent = await getEventById(event_id, creator_id)
    res.status(201).json({ message: "Event created", event: fullEvent })
  } catch (err) {
    await client.query("ROLLBACK")
    for (const file of files) {
      const fp = path.join(__dirname, "../uploads", file.filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    console.error("CREATE EVENT ERROR:", err)
    res.status(500).json({ error: "Failed to create event", details: err.message })
  } finally {
    client.release()
  }
}


/* =========================
   GET ALL EVENTS (feed)
========================= */
exports.getEvents = async (req, res) => {
  const viewer_id = req.user.user_id
  const { category, status = "active", limit = 20, offset = 0 } = req.query

  try {
    let query = `SELECT event_id FROM events WHERE status = $1`
    const params = [status]

    if (category) {
      params.push(category)
      query += ` AND category = $${params.length}`
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(limit), parseInt(offset))

    const result = await pool.query(query, params)
    const events = await Promise.all(result.rows.map(r => getEventById(r.event_id, viewer_id)))
    res.json({ events: events.filter(Boolean) })
  } catch (err) {
    console.error("GET EVENTS ERROR:", err)
    res.status(500).json({ error: "Failed to load events", details: err.message })
  }
}


/* =========================
   GET SINGLE EVENT
========================= */
exports.getEvent = async (req, res) => {
  const viewer_id = req.user.user_id
  const event_id  = parseInt(req.params.event_id)
  try {
    const event = await getEventById(event_id, viewer_id)
    if (!event) return res.status(404).json({ error: "Event not found" })
    res.json({ event })
  } catch (err) {
    console.error("GET EVENT ERROR:", err)
    res.status(500).json({ error: "Failed to load event", details: err.message })
  }
}


/* =========================
   GET MY EVENTS (creator studio)
========================= */
exports.getMyEvents = async (req, res) => {
  const creator_id = req.user.user_id
  try {
    const result = await pool.query(
      `SELECT event_id FROM events WHERE creator_id = $1 ORDER BY created_at DESC`,
      [creator_id]
    )
    const events = await Promise.all(result.rows.map(r => getEventById(r.event_id, creator_id)))
    res.json({ events: events.filter(Boolean) })
  } catch (err) {
    console.error("GET MY EVENTS ERROR:", err)
    res.status(500).json({ error: "Failed to load your events", details: err.message })
  }
}


/* =========================
   DELETE EVENT
========================= */
exports.deleteEvent = async (req, res) => {
  const creator_id = req.user.user_id
  const event_id   = parseInt(req.params.event_id)

  try {
    const check = await pool.query(
      `SELECT creator_id FROM events WHERE event_id = $1`, [event_id]
    )
    if (check.rows.length === 0) return res.status(404).json({ error: "Event not found" })
    if (check.rows[0].creator_id !== creator_id) return res.status(403).json({ error: "Not your event" })

    /* delete media files from disk */
    const mediaRes = await pool.query(
      `SELECT media_url FROM event_media WHERE event_id = $1`, [event_id]
    )
    for (const row of mediaRes.rows) {
      const filename = path.basename(row.media_url)
      const fp = path.join(__dirname, "../uploads", filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }

    await pool.query(`DELETE FROM events WHERE event_id = $1`, [event_id])
    res.json({ message: "Event deleted" })
  } catch (err) {
    console.error("DELETE EVENT ERROR:", err)
    res.status(500).json({ error: "Failed to delete event", details: err.message })
  }
}