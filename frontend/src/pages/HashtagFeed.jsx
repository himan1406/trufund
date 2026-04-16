import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../styles/hashtagfeed.css"

import {
  Hash, Heart, Trash2, ChevronLeft, ChevronRight,
  MessageCircle, Send, X as XIcon,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import defaultProfile from "../assets/images/default_profile.jpg"
import VerifiedBadge from "../components/VerifiedBadge"

export default function HashtagFeed() {
  const { tag } = useParams()
  const navigate = useNavigate()

  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const storedUsername = localStorage.getItem("username") || "Username"

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true)
      setError("")
      try {
        const [profileRes, feedRes] = await Promise.all([
          fetch("http://localhost:5000/api/users/profile", { credentials: "include" }),
          fetch(`http://localhost:5000/api/posts/hashtag/${tag}`, { credentials: "include" }),
        ])
        if (!profileRes.ok) {
          if (profileRes.status === 401) { navigate("/login"); return }
        }
        const profileData = await profileRes.json()
        setProfileImage(profileData?.user?.profile_image || null)

        if (!feedRes.ok) {
          if (feedRes.status === 401) { navigate("/login"); return }
        }
        const json = await feedRes.json()
        setData(json)
      } catch (err) {
        setError("Could not load posts.")
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [tag, navigate])

  const handleLike = async (post_id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post_id}/like`, {
        method: "POST",
        credentials: "include",
      })
      const json = await res.json()
      if (res.ok) {
        setData(prev => ({
          ...prev,
          posts: prev.posts.map(p =>
            p.post_id === post_id
              ? { ...p, liked: json.liked, like_count: json.like_count }
              : p
          ),
        }))
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <Sidebar />

      <div className="dashboard-card">
        <Topbar title={`#${tag}`} profileImage={profileImage} />

        <div className="hf-body">
          {loading ? (
            <div className="hf-loading">Loading posts...</div>
          ) : error ? (
            <div className="hf-error">{error}</div>
          ) : (
            <>
              <div className="hf-header">
                <div className="hf-tag-badge">
                  <Hash size={18} />#{tag}
                </div>
                <span className="hf-count">
                  {data?.post_count || data?.posts?.length || 0} posts
                </span>
              </div>

              {data?.posts?.length === 0 ? (
                <div className="hf-empty">
                  <Hash size={40} strokeWidth={1.2} />
                  <h3>No posts yet for #{tag}</h3>
                  <p>Be the first to post with this hashtag.</p>
                </div>
              ) : (
                <div className="hf-grid">
                  {data.posts.map(post => (
                    <PostCard
                      key={post.post_id}
                      post={post}
                      onLike={handleLike}
                      navigate={navigate}
                      storedUsername={storedUsername}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <CreatePostModal profileImage={profileImage} />
      </div>
    </div>
  )
}

/* ============================================================
   SHARED POST CARD — used in HashtagFeed and Feed
============================================================ */
export function PostCard({ post, onLike, onDelete, navigate, storedUsername }) {
  const [mediaIndex, setMediaIndex]         = useState(0)
  const [showComments, setShowComments]     = useState(false)
  const [comments, setComments]             = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment]         = useState("")
  const [posting, setPosting]               = useState(false)
  const [commentCount, setCommentCount]     = useState(post.comment_count || 0)

  const media = post.media || []
  const isOwn = post.user.username === storedUsername

  const loadComments = async () => {
    if (commentsLoaded) { setShowComments(prev => !prev); return }
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post.post_id}/comments`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
        setCommentsLoaded(true)
      }
    } catch (err) { console.error(err) }
    setShowComments(true)
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || posting) return
    setPosting(true)
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post.post_id}/comments`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setComments(prev => [...prev, data.comment])
        setCommentCount(c => c + 1)
        setNewComment("")
      }
    } catch (err) { console.error(err) }
    finally { setPosting(false) }
  }

  const handleDeleteComment = async (comment_id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/comments/${comment_id}`, {
        method: "DELETE", credentials: "include"
      })
      if (res.ok) {
        setComments(prev => prev.filter(c => c.comment_id !== comment_id))
        setCommentCount(c => Math.max(0, c - 1))
      }
    } catch (err) { console.error(err) }
  }

  const prev = (e) => {
    e.stopPropagation()
    setMediaIndex(i => Math.max(0, i - 1))
  }

  const next = (e) => {
    e.stopPropagation()
    setMediaIndex(i => Math.min(media.length - 1, i + 1))
  }

  const renderCaption = (caption) => {
    if (!caption) return null
    const parts = caption.split(/(#[a-zA-Z0-9_]+)/g)
    return parts.map((part, i) =>
      part.startsWith("#") ? (
        <span
          key={i}
          className="post-hashtag"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/hashtag/${part.slice(1)}`)
          }}
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    )
  }

  return (
    <div className="post-card">

      {/* MEDIA */}
      {media.length > 0 && (
        <div className="post-media-wrap">
          {media[mediaIndex].media_type === "video" ? (
            <video
              src={media[mediaIndex].media_url}
              className="post-media"
              controls
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <img
              src={media[mediaIndex].media_url}
              alt="post"
              className="post-media"
            />
          )}

          {media.length > 1 && (
            <>
              <button
                className="post-nav post-nav-left"
                onClick={prev}
                disabled={mediaIndex === 0}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="post-nav post-nav-right"
                onClick={next}
                disabled={mediaIndex === media.length - 1}
              >
                <ChevronRight size={16} />
              </button>
              <div className="post-dots">
                {media.map((_, i) => (
                  <div
                    key={i}
                    className={`post-dot ${i === mediaIndex ? "active" : ""}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* BODY */}
      <div className="post-body">

        {/* AUTHOR */}
        <div
          className="post-author"
          onClick={() => navigate(`/profile/${post.user.username}`)}
        >
          <img
            src={post.user.profile_image || defaultProfile}
            alt={post.user.username}
            className="post-author-avatar"
          />
          <div className="post-author-info">
            <span className="post-author-username" style={{display:"flex",alignItems:"center",gap:3}}>@{post.user.username}<VerifiedBadge isVerified={post.user.is_verified_org} isAdmin={post.user.is_admin} size={13} /></span>
            <span className="post-author-date">
              {new Date(post.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* CAPTION */}
        {post.caption && (
          <p className="post-caption">{renderCaption(post.caption)}</p>
        )}

        {/* HASHTAG PILLS */}
        {post.hashtags?.length > 0 && (
          <div className="post-tags">
            {post.hashtags.map(t => (
              <span
                key={t}
                className="post-tag-pill"
                onClick={() => navigate(`/hashtag/${t}`)}
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* ACTIONS */}
        <div className="post-actions">
          <button
            className={`post-like-btn ${post.liked ? "liked" : ""}`}
            onClick={() => onLike(post.post_id)}
          >
            <Heart size={15} fill={post.liked ? "#e74c3c" : "none"} />
            <span>{post.like_count}</span>
          </button>

          <button className="post-comment-btn" onClick={loadComments}>
            <MessageCircle size={15} />
            <span>{commentCount}</span>
          </button>

          {isOwn && onDelete && (
            <button
              className="post-delete-btn"
              onClick={() => onDelete(post.post_id)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* COMMENTS SECTION */}
        {showComments && (
          <div className="post-comments">
            {comments.length === 0 ? (
              <p className="post-comments-empty">No comments yet. Be the first!</p>
            ) : (
              <div className="post-comments-list">
                {comments.map(c => (
                  <div className="post-comment-item" key={c.comment_id}>
                    <img
                      src={c.profile_image || "/src/assets/images/default_profile.jpg"}
                      alt={c.username}
                      className="post-comment-avatar"
                      onClick={() => navigate(`/profile/${c.username}`)}
                    />
                    <div className="post-comment-body">
                      <span className="post-comment-username" onClick={() => navigate(`/profile/${c.username}`)}>@{c.username}</span>
                      <span className="post-comment-text">{c.content}</span>
                    </div>
                    {c.username === storedUsername && (
                      <button className="post-comment-delete" onClick={() => handleDeleteComment(c.comment_id)}>
                        <XIcon size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <form className="post-comment-form" onSubmit={handleAddComment}>
              <input
                className="post-comment-input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                maxLength={500}
              />
              <button type="submit" className="post-comment-submit" disabled={posting || !newComment.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}