import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/following.css"

import {
  LayoutDashboard, ZodiacSagittarius, Trophy, History,
  Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
  UserMinus, UserCheck,
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import defaultProfile from "../assets/images/default_profile.jpg"

export default function Following() {
  const navigate = useNavigate()
  const [following, setFollowing] = useState([])
  const [loading, setLoading]     = useState(true)
  const [unfollowing, setUnfollowing] = useState({}) // { username: true }
  const [profileImage, setProfileImage] = useState(null)
  const storedUsername = localStorage.getItem("username") || "Username"

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/profile", { credentials: "include" })
        if (!res.ok) { if (res.status === 401) { navigate("/login"); return } }
        const data = await res.json()
        setProfileImage(data?.user?.profile_image || null)

        /* get list of followed users */
        const followRes = await fetch("http://localhost:5000/api/users/following", { credentials: "include" })
        if (followRes.ok) {
          const followData = await followRes.json()
          setFollowing(followData.following || [])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [navigate])

  const handleUnfollow = async (username) => {
    setUnfollowing(prev => ({ ...prev, [username]: true }))
    try {
      const res = await fetch(`http://localhost:5000/api/users/${username}/follow`, {
        method: "DELETE", credentials: "include"
      })
      if (res.ok) {
        setFollowing(prev => prev.filter(u => u.username !== username))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUnfollowing(prev => ({ ...prev, [username]: false }))
    }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <div className="sidebar">
        <div className="nav">
          <div className="nav-item" onClick={() => navigate("/dashboard")}><LayoutDashboard className="nav-icon" />Dashboard</div>
          <div className="nav-item" onClick={() => navigate("/events")}><ZodiacSagittarius className="nav-icon" />Explore</div>
          <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
          <div className="nav-item" onClick={() => navigate("/donor-history")}><History className="nav-icon" />Donor History</div>
          <div className="nav-item fw-active"><Blend className="nav-icon" />Following</div>
          <div className="nav-item" onClick={() => navigate("/creator-studio")}><KeyboardMusic className="nav-icon" />Creator Studio</div>
        </div>
        <div className="support">
          <p>Support</p>
          <div className="nav-item"><Users className="nav-icon" />Community</div>
          <div className="nav-item"><Settings className="nav-icon" />Settings</div>
          <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
        </div>
      </div>

      <div className="dashboard-card">
        <Topbar title="Following" profileImage={profileImage} />

        <div className="fw-body">
          {loading ? (
            <div className="fw-loading">Loading...</div>
          ) : following.length === 0 ? (
            <div className="fw-empty">
              <div className="fw-empty-icon"><UserCheck size={48} strokeWidth={1.2} /></div>
              <h3>You're not following anyone yet</h3>
              <p>Search for people or organisations to follow and support their causes.</p>
              <button className="fw-explore-btn" onClick={() => navigate("/dashboard")}>
                Explore Dashboard
              </button>
            </div>
          ) : (
            <>
              <p className="fw-count">You follow <strong>{following.length}</strong> {following.length === 1 ? "person" : "people"}</p>
              <div className="fw-grid">
                {following.map(user => (
                  <div className="fw-card" key={user.user_id}>
                    <div className="fw-card-avatar-wrap" onClick={() => navigate(`/profile/${user.username}`)}>
                      <img
                        src={user.profile_image || defaultProfile}
                        alt={user.username}
                        className="fw-card-avatar"
                      />
                    </div>
                    <div className="fw-card-info" onClick={() => navigate(`/profile/${user.username}`)}>
                      <span className="fw-card-username">@{user.username}</span>
                      <span className="fw-card-name">{user.full_name}</span>
                    </div>
                    <button
                      className="fw-unfollow-btn"
                      onClick={() => handleUnfollow(user.username)}
                      disabled={unfollowing[user.username]}
                    >
                      <UserMinus size={14} />
                      {unfollowing[user.username] ? "..." : "Unfollow"}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <CreatePostModal profileImage={profileImage} />
      </div>
    </div>
  )
}