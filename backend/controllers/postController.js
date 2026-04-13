const pool = require("../config/db")
const path = require("path")
const fs = require("fs")

/* helper — parse #hashtags from caption */
const extractHashtags = (text) => {
  if (!text) return []
  const matches = text.match(/#([a-zA-Z0-9_]+)/g) || []
  return [...new Set(matches.map(t => t.slice(1).toLowerCase()))]
}

/* helper — upsert hashtag, return id */
const upsertHashtag = async (tag) => {
  const result = await pool.query(
    `INSERT INTO hashtags (tag) VALUES ($1)
     ON CONFLICT (tag) DO UPDATE SET post_count = hashtags.post_count + 1
     RETURNING hashtag_id`,
    [tag]
  )
  return result.rows[0].hashtag_id
}


/* =========================
   CREATE POST
========================= */
exports.createPost = async (req, res) => {
  const user_id = req.user.user_id
  const { caption } = req.body
  const files = req.files || []

  if (files.length === 0 && !caption?.trim()) {
    return res.status(400).json({ error: "Post must have a caption or at least one image/video." })
  }

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    /* 1. Insert post */
    const postResult = await client.query(
      `INSERT INTO posts (user_id, caption) VALUES ($1, $2) RETURNING post_id`,
      [user_id, caption?.trim() || null]
    )
    const post_id = postResult.rows[0].post_id

    /* 2. Insert media files */
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const mediaType = file.mimetype.startsWith("video") ? "video" : "image"
      const mediaUrl = `http://localhost:5000/uploads/${file.filename}`
      await client.query(
        `INSERT INTO post_media (post_id, media_url, media_type, position) VALUES ($1, $2, $3, $4)`,
        [post_id, mediaUrl, mediaType, i]
      )
    }

    /* 3. Extract + link hashtags */
    const tags = extractHashtags(caption)
    for (const tag of tags) {
      const hashtag_id = await upsertHashtag(tag)
      await client.query(
        `INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [post_id, hashtag_id]
      )
    }

    await client.query("COMMIT")

    /* 4. Return full post */
    const fullPost = await getPostById(post_id, user_id)
    res.status(201).json({ message: "Post created", post: fullPost })

  } catch (err) {
    await client.query("ROLLBACK")
    /* clean up uploaded files if db failed */
    for (const file of files) {
      const fp = path.join(__dirname, "../uploads", file.filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    console.error("CREATE POST ERROR:", err)
    res.status(500).json({ error: "Failed to create post", details: err.message })
  } finally {
    client.release()
  }
}


/* =========================
   GET FEED (own + following)
========================= */
exports.getFeed = async (req, res) => {
  const user_id = req.user.user_id
  const limit  = parseInt(req.query.limit)  || 20
  const offset = parseInt(req.query.offset) || 0

  try {
    const result = await pool.query(
      `SELECT DISTINCT p.post_id FROM posts p
       WHERE p.user_id = $1
          OR p.user_id IN (
            SELECT following_id FROM user_follows WHERE follower_id = $1
          )
       ORDER BY p.post_id DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    )

    const posts = await Promise.all(
      result.rows.map(r => getPostById(r.post_id, user_id))
    )

    res.json({ posts })
  } catch (err) {
    console.error("GET FEED ERROR:", err)
    res.status(500).json({ error: "Failed to load feed", details: err.message })
  }
}


/* =========================
   GET USER POSTS (profile)
========================= */
exports.getUserPosts = async (req, res) => {
  const viewer_id = req.user.user_id
  const { username } = req.params

  try {
    const userResult = await pool.query(
      `SELECT user_id FROM users WHERE username = $1`, [username]
    )
    if (userResult.rows.length === 0) return res.status(404).json({ error: "User not found" })
    const profile_user_id = userResult.rows[0].user_id

    const result = await pool.query(
      `SELECT post_id FROM posts WHERE user_id = $1 ORDER BY post_id DESC`,
      [profile_user_id]
    )
    const posts = await Promise.all(
      result.rows.map(r => getPostById(r.post_id, viewer_id))
    )
    res.json({ posts })
  } catch (err) {
    console.error("GET USER POSTS ERROR:", err)
    res.status(500).json({ error: "Failed to load posts", details: err.message })
  }
}


/* =========================
   GET HASHTAG FEED
========================= */
exports.getHashtagFeed = async (req, res) => {
  const user_id = req.user.user_id
  const tag = req.params.tag.toLowerCase()

  try {
    const hashtagResult = await pool.query(
      `SELECT hashtag_id, tag, post_count FROM hashtags WHERE tag = $1`, [tag]
    )
    if (hashtagResult.rows.length === 0) {
      return res.json({ hashtag: tag, post_count: 0, posts: [] })
    }
    const hashtag = hashtagResult.rows[0]

    const result = await pool.query(
      `SELECT p.post_id FROM posts p
       JOIN post_hashtags ph ON p.post_id = ph.post_id
       WHERE ph.hashtag_id = $1
       ORDER BY p.post_id DESC`,
      [hashtag.hashtag_id]
    )

    const posts = await Promise.all(
      result.rows.map(r => getPostById(r.post_id, user_id))
    )

    res.json({ hashtag: hashtag.tag, post_count: hashtag.post_count, posts })
  } catch (err) {
    console.error("GET HASHTAG FEED ERROR:", err)
    res.status(500).json({ error: "Failed to load hashtag feed", details: err.message })
  }
}


/* =========================
   SEARCH HASHTAGS
========================= */
exports.searchHashtags = async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 1) return res.json({ hashtags: [] })

  try {
    const result = await pool.query(
      `SELECT tag, post_count FROM hashtags
       WHERE tag ILIKE $1
       ORDER BY post_count DESC
       LIMIT 8`,
      [`%${q.trim().replace(/^#/, "")}%`]
    )
    res.json({ hashtags: result.rows })
  } catch (err) {
    console.error("SEARCH HASHTAGS ERROR:", err)
    res.status(500).json({ error: "Failed to search hashtags", details: err.message })
  }
}


/* =========================
   LIKE / UNLIKE POST
========================= */
exports.toggleLike = async (req, res) => {
  const user_id = req.user.user_id
  const post_id = parseInt(req.params.post_id)

  try {
    const existing = await pool.query(
      `SELECT like_id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [post_id, user_id]
    )

    if (existing.rows.length > 0) {
      /* unlike */
      await pool.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [post_id, user_id])
      await pool.query(`UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE post_id = $1`, [post_id])
      const r = await pool.query(`SELECT like_count FROM posts WHERE post_id = $1`, [post_id])
      return res.json({ liked: false, like_count: r.rows[0].like_count })
    } else {
      /* like */
      await pool.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [post_id, user_id])
      await pool.query(`UPDATE posts SET like_count = like_count + 1 WHERE post_id = $1`, [post_id])
      const r = await pool.query(`SELECT like_count FROM posts WHERE post_id = $1`, [post_id])
      return res.json({ liked: true, like_count: r.rows[0].like_count })
    }
  } catch (err) {
    console.error("TOGGLE LIKE ERROR:", err)
    res.status(500).json({ error: "Failed to toggle like", details: err.message })
  }
}


/* =========================
   DELETE POST
========================= */
exports.deletePost = async (req, res) => {
  const user_id = req.user.user_id
  const post_id = parseInt(req.params.post_id)

  try {
    const postResult = await pool.query(
      `SELECT user_id FROM posts WHERE post_id = $1`, [post_id]
    )
    if (postResult.rows.length === 0) return res.status(404).json({ error: "Post not found" })
    if (postResult.rows[0].user_id !== user_id) return res.status(403).json({ error: "Not your post" })

    /* delete media files from disk */
    const mediaResult = await pool.query(
      `SELECT media_url FROM post_media WHERE post_id = $1`, [post_id]
    )
    for (const row of mediaResult.rows) {
      const filename = path.basename(row.media_url)
      const fp = path.join(__dirname, "../uploads", filename)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }

    await pool.query(`DELETE FROM posts WHERE post_id = $1`, [post_id])
    res.json({ message: "Post deleted" })
  } catch (err) {
    console.error("DELETE POST ERROR:", err)
    res.status(500).json({ error: "Failed to delete post", details: err.message })
  }
}


/* =========================
   INTERNAL HELPER
========================= */
async function getPostById(post_id, viewer_id) {
  const postResult = await pool.query(
    `SELECT p.post_id, p.caption, p.like_count, p.comment_count, p.created_at,
            u.user_id, u.username, u.profile_image
     FROM posts p
     JOIN users u ON p.user_id = u.user_id
     WHERE p.post_id = $1`,
    [post_id]
  )
  if (postResult.rows.length === 0) return null
  const post = postResult.rows[0]

  const mediaResult = await pool.query(
    `SELECT media_url, media_type, position FROM post_media
     WHERE post_id = $1 ORDER BY position ASC`,
    [post_id]
  )

  const hashtagResult = await pool.query(
    `SELECT h.tag FROM hashtags h
     JOIN post_hashtags ph ON h.hashtag_id = ph.hashtag_id
     WHERE ph.post_id = $1`,
    [post_id]
  )

  const likedResult = await pool.query(
    `SELECT like_id FROM post_likes WHERE post_id = $1 AND user_id = $2`,
    [post_id, viewer_id]
  )

  return {
    post_id:       post.post_id,
    caption:       post.caption,
    like_count:    post.like_count,
    comment_count: post.comment_count || 0,
    created_at:    post.created_at,
    liked:         likedResult.rows.length > 0,
    user: {
      user_id:       post.user_id,
      username:      post.username,
      profile_image: post.profile_image || null,
    },
    media:    mediaResult.rows,
    hashtags: hashtagResult.rows.map(r => r.tag),
  }
}


/* =========================
   GET COMMENTS FOR A POST
========================= */
exports.getComments = async (req, res) => {
  const post_id = parseInt(req.params.post_id)
  try {
    const result = await pool.query(
      `SELECT c.comment_id, c.content, c.created_at,
              u.user_id, u.username, u.profile_image
       FROM post_comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [post_id]
    )
    res.json({ comments: result.rows })
  } catch (err) {
    res.status(500).json({ error: "Failed to load comments" })
  }
}


/* =========================
   ADD COMMENT
========================= */
exports.addComment = async (req, res) => {
  const user_id = req.user.user_id
  const post_id = parseInt(req.params.post_id)
  const { content } = req.body

  if (!content?.trim()) return res.status(400).json({ error: "Comment cannot be empty" })

  try {
    const result = await pool.query(
      `INSERT INTO post_comments (post_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING comment_id, content, created_at`,
      [post_id, user_id, content.trim()]
    )

    await pool.query(
      `UPDATE posts SET comment_count = comment_count + 1 WHERE post_id = $1`, [post_id]
    )

    const userRes = await pool.query(
      `SELECT username, profile_image FROM users WHERE user_id = $1`, [user_id]
    )

    res.status(201).json({
      comment: {
        ...result.rows[0],
        user_id,
        username:      userRes.rows[0].username,
        profile_image: userRes.rows[0].profile_image || null,
      }
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" })
  }
}


/* =========================
   DELETE COMMENT
========================= */
exports.deleteComment = async (req, res) => {
  const user_id    = req.user.user_id
  const comment_id = parseInt(req.params.comment_id)
  try {
    const check = await pool.query(
      `SELECT user_id, post_id FROM post_comments WHERE comment_id = $1`, [comment_id]
    )
    if (check.rows.length === 0) return res.status(404).json({ error: "Comment not found" })
    if (check.rows[0].user_id !== user_id) return res.status(403).json({ error: "Not your comment" })

    await pool.query(`DELETE FROM post_comments WHERE comment_id = $1`, [comment_id])
    await pool.query(
      `UPDATE posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE post_id = $1`,
      [check.rows[0].post_id]
    )
    res.json({ message: "Comment deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment" })
  }
}


/* =========================
   GET TRENDING HASHTAGS
========================= */
exports.getTrendingHashtags = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tag, post_count FROM hashtags
       WHERE post_count > 0
       ORDER BY post_count DESC
       LIMIT 10`
    )
    /* fallback to seeded tags if nothing posted yet */
    if (result.rows.length === 0) {
      const fallback = await pool.query(
        `SELECT tag, post_count FROM hashtags ORDER BY hashtag_id ASC LIMIT 10`
      )
      return res.json({ hashtags: fallback.rows })
    }
    res.json({ hashtags: result.rows })
  } catch (err) {
    res.status(500).json({ error: "Failed to load trending hashtags" })
  }
}