import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Bell } from "lucide-react"
import SearchBar from "./SearchBar"
import { useSearch } from "../hooks/useSearch"
import defaultProfile from "../assets/images/default_profile.jpg"
import "../styles/topbar.css"
import "../styles/verifiedbadge.css"

export default function Topbar({ title, profileImage }) {
  const navigate = useNavigate()
  const search = useSearch()

  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)

  const profileRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/notifications", { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          setNotifs(data.notifications || [])
          setUnread(data.unread_count || 0)
        }
      } catch (err) { console.error(err) }
    }
    fetchNotifs()
  }, [])

  const handleOpenNotifs = async () => {
    setNotifOpen(prev => !prev)
    setProfileOpen(false)
    if (!notifOpen && unread > 0) {
      try {
        await fetch("http://localhost:5000/api/notifications/read-all", {
          method: "PUT", credentials: "include"
        })
        setUnread(0)
        setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      } catch (err) { console.error(err) }
    }
  }

  const handleNotifClick = (notif) => {
    setNotifOpen(false)
    if (notif.type === "new_event" || notif.type === "new_donation") {
      navigate(`/events/${notif.related_id}`)
    } else if (notif.type === "new_follower") {
      navigate("/profile")
    }
  }

  const storedUsername = localStorage.getItem("username") || "Username"

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include"
      })
    } catch (err) {
      console.error("Logout error:", err)
    } finally {
      localStorage.removeItem("username")
      setProfileOpen(false)
      navigate("/login")
    }
  }

  return (
    <div className="topbar">
      <h2>{title}</h2>
      <SearchBar {...search} />

      <div className="tb-profile-area">

        {/* NOTIFICATION BELL */}
        <div className="tb-notif-wrap" ref={notifRef}>
          <button className="tb-bell-btn" onClick={handleOpenNotifs}>
            <Bell size={20} />
            {unread > 0 && (
              <span className="tb-notif-badge">{unread > 9 ? "9+" : unread}</span>
            )}
          </button>

          <div className={`tb-notif-panel ${notifOpen ? "open" : ""}`}>
            <div className="tb-notif-header">
              <span>Notifications</span>
            </div>
            {notifs.length === 0 ? (
              <div className="tb-notif-empty">No notifications yet</div>
            ) : (
              <div className="tb-notif-list">
                {notifs.map(n => (
                  <div
                    key={n.notif_id}
                    className={`tb-notif-item ${!n.is_read ? "unread" : ""}`}
                    onClick={() => handleNotifClick(n)}
                  >
                    <div className={`tb-notif-dot ${n.type}`} />
                    <div className="tb-notif-content">
                      <span className="tb-notif-title">{n.title}</span>
                      {n.message && <span className="tb-notif-msg">{n.message}</span>}
                      <span className="tb-notif-time">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AVATAR + SLIDE PANEL */}
        <div className="tb-avatar-wrap" ref={profileRef}>
          <img
            src={profileImage || defaultProfile}
            alt="profile"
            className="tb-avatar"
            onClick={() => { setProfileOpen(prev => !prev); setNotifOpen(false) }}
          />
          <div className={`tb-slide-panel ${profileOpen ? "open" : ""}`}>
            <div className="tb-slide-username">@{storedUsername}</div>
            <div className="tb-slide-divider" />
            <div className="tb-slide-item" onClick={() => { setProfileOpen(false); navigate("/profile") }}>👤 Profile</div>
            <div className="tb-slide-item" onClick={() => { setProfileOpen(false); navigate("/edit-profile") }}>✏️ Edit Profile</div>
            <div className="tb-slide-item" onClick={() => { setProfileOpen(false); navigate("/creator-studio") }}>🎵 Creator Studio</div>
            <div className="tb-slide-divider" />
            <div className="tb-slide-item" onClick={handleLogout} style={{ color: "#d9534f" }}>🚪 Logout</div>
          </div>
        </div>

      </div>
    </div>
  )
}