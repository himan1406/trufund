import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/feed.css"

import {
  ImagePlus, X, Send, Loader,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import { PostCard } from "./HashtagFeed"
import defaultProfile from "../assets/images/default_profile.jpg"

export default function Feed() {
  const navigate = useNavigate()

  const [posts, setPosts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [profileImage, setProfileImage]   = useState(null)
  const [trendingTags, setTrendingTags]   = useState([])

  /* create post state */
  const [caption, setCaption]     = useState("")
  const [files, setFiles]         = useState([])      // { file, preview, type }
  const [previews, setPreviews]   = useState([])
  const [posting, setPosting]     = useState(false)
  const [postError, setPostError] = useState("")
  const fileInputRef              = useRef(null)

  const storedUsername = localStorage.getItem("username") || "Username"

  /* ── FETCH FEED ── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, feedRes, hashRes] = await Promise.all([
          fetch("http://localhost:5000/api/users/profile",           { credentials: "include" }),
          fetch("http://localhost:5000/api/posts/feed",              { credentials: "include" }),
          fetch("http://localhost:5000/api/posts/trending/hashtags", { credentials: "include" }),
        ])
        if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }

        const profileData = await profileRes.json()
        setProfileImage(profileData?.user?.profile_image || null)

        if (feedRes.ok) {
          const feedData = await feedRes.json()
          setPosts(feedData.posts || [])
        }
        if (hashRes.ok) {
          const hashData = await hashRes.json()
          setTrendingTags(hashData.hashtags || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [navigate])

  /* ── HANDLE FILE PICK ── */
  const handleFilePick = (e) => {
    const picked = Array.from(e.target.files)
    if (!picked.length) return

    const newFiles = picked.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
    }))

    setFiles(prev => [...prev, ...newFiles].slice(0, 10))
    e.target.value = ""
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  /* ── CREATE POST ── */
  const handlePost = async () => {
    if (!caption.trim() && files.length === 0) {
      setPostError("Add a caption or at least one image/video.")
      return
    }
    setPosting(true); setPostError("")

    try {
      const formData = new FormData()
      formData.append("caption", caption.trim())
      files.forEach(f => formData.append("media", f.file))

      const res = await fetch("http://localhost:5000/api/posts", {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) { setPostError(data.error || "Failed to post."); return }

      /* prepend new post */
      setPosts(prev => [data.post, ...prev])
      setCaption("")
      setFiles([])
    } catch (err) {
      setPostError("Server error. Try again.")
    } finally {
      setPosting(false)
    }
  }

  /* ── LIKE ── */
  const handleLike = async (post_id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post_id}/like`, {
        method: "POST", credentials: "include"
      })
      const json = await res.json()
      if (res.ok) {
        setPosts(prev => prev.map(p =>
          p.post_id === post_id
            ? { ...p, liked: json.liked, like_count: json.like_count }
            : p
        ))
      }
    } catch (err) { console.error(err) }
  }

  /* ── DELETE ── */
  const handleDelete = async (post_id) => {
    if (!window.confirm("Delete this post?")) return
    try {
      const res = await fetch(`http://localhost:5000/api/posts/${post_id}`, {
        method: "DELETE", credentials: "include"
      })
      if (res.ok) setPosts(prev => prev.filter(p => p.post_id !== post_id))
    } catch (err) { console.error(err) }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <Sidebar />

      <div className="dashboard-card">
        <Topbar title="Feed" profileImage={profileImage} />

        <div className="feed-body">

          {/* LEFT — feed */}
          <div className="feed-main">

            {/* CREATE POST BOX */}
            <div className="create-post-box">
              <div className="create-post-top">
                <img
                  src={profileImage || defaultProfile}
                  alt="you"
                  className="create-post-avatar"
                />
                <textarea
                  className="create-post-input"
                  placeholder={`What's on your mind, ${storedUsername}? Use #hashtags to tag your post.`}
                  value={caption}
                  onChange={e => { setCaption(e.target.value); setPostError("") }}
                  rows={3}
                />
              </div>

              {/* MEDIA PREVIEWS */}
              {files.length > 0 && (
                <div className="create-post-previews">
                  {files.map((f, i) => (
                    <div key={i} className="create-post-preview-wrap">
                      {f.type === "video" ? (
                        <video src={f.preview} className="create-post-preview" />
                      ) : (
                        <img src={f.preview} alt="preview" className="create-post-preview" />
                      )}
                      <button className="create-post-remove" onClick={() => removeFile(i)}>
                        <X size={12} />
                      </button>
                      {f.type === "video" && <div className="create-post-video-badge">VIDEO</div>}
                    </div>
                  ))}
                </div>
              )}

              {postError && <p className="create-post-error">{postError}</p>}

              <div className="create-post-actions">
                <button
                  className="create-post-media-btn"
                  onClick={() => fileInputRef.current.click()}
                  disabled={files.length >= 10}
                >
                  <ImagePlus size={18} />
                  <span>Photo / Video</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFilePick}
                />
                <button
                  className="create-post-submit"
                  onClick={handlePost}
                  disabled={posting}
                >
                  {posting ? <Loader size={15} className="spin" /> : <Send size={15} />}
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>

            {/* POSTS */}
            {loading ? (
              <div className="feed-loading">Loading feed...</div>
            ) : posts.length === 0 ? (
              <div className="feed-discover">
                <h3 className="feed-discover-title">Discover posts</h3>
                <p className="feed-discover-sub">Follow people or explore trending topics to fill your feed.</p>
                <div className="feed-discover-tags">
                  {(trendingTags.length > 0 ? trendingTags : [
                    {tag:"crowdfunding",post_count:0},{tag:"donate",post_count:0},
                    {tag:"charity",post_count:0},{tag:"helpothers",post_count:0},
                    {tag:"community",post_count:0},{tag:"fundraiser",post_count:0},
                  ]).map(t => (
                    <div key={t.tag} className="feed-discover-tag" onClick={() => navigate(`/hashtag/${t.tag}`)}>
                      <span className="feed-hashtag-tag">#{t.tag}</span>
                      {t.post_count > 0 && <span className="feed-discover-count">{t.post_count} posts</span>}
                    </div>
                  ))}
                </div>
                <button className="feed-discover-explore" onClick={() => navigate("/events")}>
                  Browse Fundraiser Events →
                </button>
              </div>
            ) : (
              <div className="feed-list">
                {posts.map(post => (
                  <PostCard
                    key={post.post_id}
                    post={post}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    navigate={navigate}
                    storedUsername={storedUsername}
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — trending hashtags */}
          <div className="feed-right">
            <div className="feed-panel">
              <div className="feed-panel-header">
                <h3>Popular Hashtags</h3>
              </div>
              {(trendingTags.length > 0
                ? trendingTags.slice(0, 10)
                : ["crowdfunding","donate","charity","helpothers","community","fundraiser","ngo","giveback","socialgood","impact"].map(t => ({tag:t,post_count:0}))
              ).map(t => (
                <div key={t.tag} className="feed-hashtag-item" onClick={() => navigate(`/hashtag/${t.tag}`)}>
                  <span className="feed-hashtag-tag">#{t.tag}</span>
                  {t.post_count > 0 && <span className="feed-hashtag-count">{t.post_count}</span>}
                </div>
              ))}
            </div>
          </div>

        </div>

        <CreatePostModal profileImage={profileImage} onPostCreated={(newPost) => setPosts(prev => [newPost, ...prev])} />
      </div>
    </div>
  )
}