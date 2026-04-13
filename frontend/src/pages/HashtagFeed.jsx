import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../styles/hashtagfeed.css"

import {
  LayoutDashboard, ZodiacSagittarius, Trophy, History,
  Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
  Hash, Heart, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import defaultProfile from "../assets/images/default_profile.jpg"

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

      <div className="sidebar">
        <div className="nav">
          <div className="nav-item" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="nav-icon" />Dashboard
          </div>
          <div className="nav-item" onClick={() => navigate("/events")}>
            <ZodiacSagittarius className="nav-icon" />Explore
          </div>
          <div className="nav-item">
            <Trophy className="nav-icon" />Leaderboard
          </div>
          <div className="nav-item" onClick={() => navigate("/donor-history")}>
            <History className="nav-icon" />Donor History
          </div>
          <div className="nav-item" onClick={() => navigate("/following")}>
            <Blend className="nav-icon" />Following
          </div>
          <div className="nav-item" onClick={() => navigate("/creator-studio")}>
            <KeyboardMusic className="nav-icon" />Creator Studio
          </div>
        </div>
        <div className="support">
          <p>Support</p>
          <div className="nav-item"><Users className="nav-icon" />Community</div>
          <div className="nav-item"><Settings className="nav-icon" />Settings</div>
          <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
        </div>
      </div>

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
  const [mediaIndex, setMediaIndex] = useState(0)
  const media = post.media || []
  const isOwn = post.user.username === storedUsername

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
            <span className="post-author-username">@{post.user.username}</span>
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

          {isOwn && onDelete && (
            <button
              className="post-delete-btn"
              onClick={() => onDelete(post.post_id)}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}