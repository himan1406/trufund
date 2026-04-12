import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, X, ImagePlus, Send, Loader } from "lucide-react"
import "../styles/createpostmodal.css"
import defaultProfile from "../assets/images/default_profile.jpg"

export default function CreatePostModal({ profileImage, onPostCreated }) {
  const navigate      = useNavigate()
  const fileInputRef  = useRef(null)

  const [open, setOpen]         = useState(false)
  const [caption, setCaption]   = useState("")
  const [files, setFiles]       = useState([])
  const [posting, setPosting]   = useState(false)
  const [postError, setPostError] = useState("")

  const storedUsername = localStorage.getItem("username") || "Username"

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

  const removeFile = (index) => setFiles(prev => prev.filter((_, i) => i !== index))

  const handleClose = () => {
    setOpen(false)
    setCaption("")
    setFiles([])
    setPostError("")
  }

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

      const res  = await fetch("http://localhost:5000/api/posts", {
        method: "POST", credentials: "include", body: formData
      })
      const data = await res.json()

      if (!res.ok) { setPostError(data.error || "Failed to post."); return }

      /* notify parent page if it wants to refresh */
      if (onPostCreated) onPostCreated(data.post)

      handleClose()

      /* if not already on feed, navigate there to see the post */
      if (!window.location.pathname.includes("/feed")) {
        navigate("/feed")
      }
    } catch {
      setPostError("Server error. Try again.")
    } finally {
      setPosting(false)
    }
  }

  return (
    <>
      {/* FLOATING + BUTTON */}
      <button className="fab" onClick={() => setOpen(true)} title="Create Post">
        <Plus size={26} />
      </button>

      {/* BACKDROP */}
      {open && <div className="cpm-backdrop" onClick={handleClose} />}

      {/* MODAL */}
      <div className={`cpm-modal ${open ? "open" : ""}`}>

        {/* HEADER */}
        <div className="cpm-header">
          <h3>Create Post</h3>
          <button className="cpm-close" onClick={handleClose}><X size={18} /></button>
        </div>

        {/* AUTHOR ROW */}
        <div className="cpm-author">
          <img src={profileImage || defaultProfile} alt="you" className="cpm-avatar" />
          <span className="cpm-username">@{storedUsername}</span>
        </div>

        {/* CAPTION */}
        <textarea
          className="cpm-caption"
          placeholder="What's on your mind? Use #hashtags like #crowdfunding to tag your post..."
          value={caption}
          onChange={e => { setCaption(e.target.value); setPostError("") }}
          rows={4}
        />

        {/* MEDIA PREVIEWS */}
        {files.length > 0 && (
          <div className="cpm-previews">
            {files.map((f, i) => (
              <div key={i} className="cpm-preview-wrap">
                {f.type === "video"
                  ? <video src={f.preview} className="cpm-preview" />
                  : <img src={f.preview} alt="preview" className="cpm-preview" />
                }
                <button className="cpm-remove" onClick={() => removeFile(i)}><X size={11} /></button>
                {f.type === "video" && <div className="cpm-video-badge">VIDEO</div>}
              </div>
            ))}
            {files.length < 10 && (
              <button className="cpm-add-more" onClick={() => fileInputRef.current.click()}>
                <Plus size={20} />
              </button>
            )}
          </div>
        )}

        {postError && <p className="cpm-error">{postError}</p>}

        {/* ACTIONS */}
        <div className="cpm-actions">
          <button
            className="cpm-media-btn"
            onClick={() => fileInputRef.current.click()}
            disabled={files.length >= 10}
          >
            <ImagePlus size={17} />
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
          <button className="cpm-post-btn" onClick={handlePost} disabled={posting}>
            {posting ? <Loader size={15} className="spin" /> : <Send size={15} />}
            {posting ? "Posting..." : "Post"}
          </button>
        </div>

      </div>
    </>
  )
}