import { useState, useEffect } from "react"
import "../styles/profile.css"

import {
  LayoutDashboard,
  ZodiacSagittarius,
  Trophy,
  History,
  Blend,
  KeyboardMusic,
  Users,
  Settings,
  MessageCircleQuestionMark,
  Search,
  CircleArrowDown,
  Bell,
  Heart,
  UserPlus,
} from "lucide-react"

import defaultProfile from "../assets/images/default_profile.jpg"
import { useNavigate } from "react-router-dom"

export default function Profile() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const navigate = useNavigate()
  const username = localStorage.getItem("username") || "Username"

  const mockTopEvents = [
    { org: "GreenRoots Foundation", event: "Big Feed Drive", progress: 72 },
    { org: "EarthKind Initiative", event: "Helping The Homeless", progress: 55 },
    { org: "BrightFuture Fund", event: "Book Donations", progress: 88 },
    { org: "BrightFuture Fund", event: "School Supplies Drive", progress: 40 },
    { org: "Warriors With Cause", event: "Old Age Home Drive", progress: 63 },
  ]

  const mockTrending = [
    { title: "The Waves", sub: "Studio Shodwe" },
    { title: "End of the Night", sub: "Matt Zhang" },
    { title: "Between Us", sub: "Neil Tran" },
  ]

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/profile", {
          credentials: "include",
        })
        if (!res.ok) {
          if (res.status === 401) { navigate("/login"); return }
          throw new Error("Failed to load profile")
        }
        const data = await res.json()
        setProfileData(data)
      } catch (err) {
        setError("Could not load profile data.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [navigate])

  const stats = profileData?.stats || { followers_count: 0, following_count: 0, donations_count: 0 }
  const donations = profileData?.donation_history || []

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <div className="sidebar">
        <div className="nav">
          <div className="nav-item" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="nav-icon" />Dashboard
          </div>
          <div className="nav-item"><ZodiacSagittarius className="nav-icon" />Explore</div>
          <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
          <div className="nav-item"><History className="nav-icon" />Donor History</div>
          <div className="nav-item"><Blend className="nav-icon" />Following</div>
          <div className="nav-item"><KeyboardMusic className="nav-icon" />Creator Studio</div>
        </div>
        <div className="support">
          <p>Support</p>
          <div className="nav-item"><Users className="nav-icon" />Community</div>
          <div className="nav-item"><Settings className="nav-icon" />Settings</div>
          <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
        </div>
      </div>

      <div className="dashboard-card">

        <div className="topbar">
          <h2>Profile</h2>
          <div className="search-container">
            <Search className="search-icon" />
            <input className="search" placeholder="Search Events, NGOs, People" />
          </div>
          <div className="profile">
            <Bell className="notification-icon" />
            <div className="profile-dropdown">
              <CircleArrowDown className="profile-icon" onClick={() => setMenuOpen(!menuOpen)} />
              <span className="username">{username}</span>
              <img src={defaultProfile} alt="profile" className="profile-avatar" />
              {menuOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => setMenuOpen(false)}>Profile</div>
                  <div className="dropdown-item" onClick={() => { setMenuOpen(false); navigate("/edit-profile") }}>
                        Edit Profile
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-body">

          <div className="profile-main">
            {loading ? (
              <div className="profile-loading">Loading profile...</div>
            ) : error ? (
              <div className="profile-error">{error}</div>
            ) : (
              <>
                <div className="profile-hero">
                  <div className="avatar-ring">
                    <img
                      src={profileData?.user?.profile_image || defaultProfile}
                      alt="avatar"
                      className="profile-hero-avatar"
                    />
                  </div>
                  <div className="profile-hero-info">
                    <h2 className="profile-username">@{profileData?.user?.username || username}</h2>
                    <div className="profile-divider" />
                    <div className="profile-stats">
                      <div className="stat">
                        <span className="stat-num">{stats.following_count}</span>
                        <span className="stat-label">Following</span>
                      </div>
                      <div className="stat">
                        <span className="stat-num">{stats.followers_count}</span>
                        <span className="stat-label">Followers</span>
                      </div>
                    </div>
                    <div className="profile-actions">
                      <button className="btn-follow"><UserPlus size={15} /> Follow</button>
                      <button className="btn-support"><Heart size={15} /> Support</button>
                    </div>
                  </div>
                </div>

                <div className="section-divider" />

                <div className="donor-summary">
                  <div className="donor-stat-row">
                    <span className="donor-label">Number of Donations:</span>
                    <span className="donor-value">{stats.donations_count}</span>
                  </div>
                </div>

                <div className="section-divider" />

                <div className="donation-history-section">
                  <h3 className="section-title">Donation History</h3>
                  {donations.length === 0 ? (
                    <div className="donation-empty">
                      <div className="empty-icon"><Heart size={32} strokeWidth={1.5} /></div>
                      <p>No donations yet</p>
                      <span>Your donation history will appear here once you start contributing.</span>
                    </div>
                  ) : (
                    <div className="donation-list">
                      {donations.map((d) => (
                        <div className="donation-item" key={d.donation_id}>
                          <div className="donation-amount">${d.amount}</div>
                          <div className="donation-info">
                            <span className="donation-campaign">{d.campaign_title}</span>
                            {d.message && <span className="donation-message">{d.message}</span>}
                          </div>
                          <span className="donation-date">
                            {new Date(d.donated_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="profile-right">
            <div className="profile-panel">
              <div className="panel-header">
                <h3>Top Events</h3>
                <span className="panel-more">•••</span>
              </div>
              {mockTopEvents.map((e, i) => (
                <div className="profile-event-item" key={i}>
                  <div className="event-avatar-placeholder" />
                  <div className="event-info">
                    <span className="event-org">{e.org}</span>
                    <span className="event-name">{e.event}</span>
                    <div className="event-progress-bar">
                      <div className="event-progress-fill" style={{ width: `${e.progress}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="profile-panel trending-panel">
              <div className="panel-header">
                <h3>Trending</h3>
                <span className="panel-more">•••</span>
              </div>
              {mockTrending.map((t, i) => (
                <div className="trending-item" key={i}>
                  <div className="trending-avatar" />
                  <div className="trending-info">
                    <span className="trending-title">{t.title}</span>
                    <span className="trending-sub">{t.sub}</span>
                  </div>
                  <button className="trending-play">▶</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}