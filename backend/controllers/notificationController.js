const pool = require("../config/db")

/* =========================
   GET NOTIFICATIONS
========================= */
exports.getNotifications = async (req, res) => {
    const user_id = req.user.user_id
    try {
        const result = await pool.query(
            `SELECT notif_id, type, title, message, related_id, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
            [user_id]
        )
        const unread = result.rows.filter(n => !n.is_read).length
        res.json({ notifications: result.rows, unread_count: unread })
    } catch (err) {
        console.error("GET NOTIFS ERROR:", err)
        res.status(500).json({ error: "Failed to load notifications" })
    }
}

/* =========================
   MARK ALL AS READ
========================= */
exports.markAllRead = async (req, res) => {
    const user_id = req.user.user_id
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [user_id]
        )
        res.json({ message: "All notifications marked as read" })
    } catch (err) {
        res.status(500).json({ error: "Failed to mark notifications as read" })
    }
}

/* =========================
   MARK ONE AS READ
========================= */
exports.markOneRead = async (req, res) => {
    const user_id = req.user.user_id
    const notif_id = parseInt(req.params.notif_id)
    try {
        await pool.query(
            `UPDATE notifications SET is_read = TRUE WHERE notif_id = $1 AND user_id = $2`,
            [notif_id, user_id]
        )
        res.json({ message: "Notification marked as read" })
    } catch (err) {
        res.status(500).json({ error: "Failed to mark notification as read" })
    }
}