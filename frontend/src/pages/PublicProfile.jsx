import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../styles/publicprofile.css"

import {
  LayoutDashboard, ZodiacSagittarius, Trophy, History,
  Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
  Heart, UserPlus, UserCheck, Lock,
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import { PostCard } from "../pages/HashtagFeed"
import defaultProfile from "../assets/images/default_profile.jpg"

const mockTopEvents = [
  { org: "GreenRoots Foundation", event: "Big Feed Drive", progress: 72 },
  { org: "EarthKind Initiative", event: "Helping The Homeless", progress: 55 },
  { org: "BrightFuture Fund", event: "Book Donations", progress: 88 },
  { org: "Warriors With Cause", event: "Old Age Home Drive", progress: 63 },
  { org: "HopeRise NGO", event: "Winter Relief Drive", progress: 47 },
]

const mockTrending = [
  { title: "The Waves", sub: "Studio Shodwe" },
  { title: "End of the Night", sub: "Matt Zhang" },
  { title: "Between Us", sub: "Neil Tran" },
]

export default function PublicProfile() {
  const { username } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [myProfileImage, setMyProfileImage] = useState(null)
  const [posts, setPosts] = useState([])

  const storedUsername = localStorage.getItem("username") || "Username"

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true)
      setError("")
      try {
        /* fetch own profile image for topbar */
        const meRes = await fetch("http://localhost:5000/api/users/profile", { credentials: "include" })
        if (meRes.ok) {
          const meData = await meRes.json()
          setMyProfileImage(meData?.user?.profile_image || null)
        }

        const res = await fetch(`http://localhost:5000/api/users/${username}`, {
          credentials: "include"
        })

        if (res.status === 404) { setError("User not found."); setLoading(false); return }
        if (!res.ok) { if (res.status === 401) { navigate("/login"); return } }

        const json = await res.json()

        /* redirect to own profile */
        if (json.is_own_profile) { navigate("/profile"); return }

        setData(json)
        setIsFollowing(json.is_following)
        setFollowersCount(json.stats.followers_count)

        /* fetch this user's posts */
        const postsRes = await fetch(`http://localhost:5000/api/posts/user/${username}`, { credentials: "include" })
        if (postsRes.ok) {
          const postsData = await postsRes.json()
          setPosts(postsData.posts || [])
        }
      } catch (err) {
        setError("Could not load profile.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [username, navigate])

  const handleFollow = async () => {
    if (followLoading) return
    setFollowLoading(true)

    /* optimistic update */
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowersCount(c => wasFollowing ? c - 1 : c + 1)

    try {
      const res = await fetch(`http://localhost:5000/api/users/${username}/follow`, {
        method: wasFollowing ? "DELETE" : "POST",
        credentials: "include"
      })
      const json = await res.json()
      if (!res.ok) {
        /* revert on failure */
        setIsFollowing(wasFollowing)
        setFollowersCount(c => wasFollowing ? c + 1 : c - 1)
      } else {
        setFollowersCount(json.followers_count)
      }
    } catch (err) {
      setIsFollowing(wasFollowing)
      setFollowersCount(c => wasFollowing ? c + 1 : c - 1)
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="nav">
          <div className="nav-item" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="nav-icon" />Dashboard
          </div>
          <div className="nav-item"><ZodiacSagittarius className="nav-icon" />Explore</div>
          <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
          <div className="nav-item" onClick={() => navigate("/donor-history")}>
            <History className="nav-icon" />Donor History
          </div>
          <div className="nav-item" onClick={() => navigate("/following")}><Blend className="nav-icon" />Following</div>
          <div className="nav-item" onClick={() => navigate("/creator-studio")}><KeyboardMusic className="nav-icon" />Creator Studio</div>
        </div>
        <div className="support">
          <p>Support</p>
          <div className="nav-item"><Users className="nav-icon" />Community</div>
          <div className="nav-item"><Settings className="nav-icon" />Settings</div>
          <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="dashboard-card">

        {/* TOPBAR */}
        <Topbar title="Profile" profileImage={myProfileImage} />

        {/* BODY */}
        <div className="profile-body">

          <div className="profile-main">
            {loading ? (
              <div className="profile-loading">Loading profile...</div>
            ) : error ? (
              <div className="pp-not-found">
                <div className="pp-not-found-icon">👤</div>
                <h3>{error}</h3>
                <button className="pp-back-btn" onClick={() => navigate("/dashboard")}>
                  Back to Dashboard
                </button>
              </div>
            ) : data && (
              <>
                {/* PROFILE HERO */}
                <div className="profile-hero">
                  <div className="avatar-ring">
                    <img
                      src={data.user.profile_image || defaultProfile}
                      alt="avatar"
                      className="profile-hero-avatar"
                    />
                  </div>
                  <div className="profile-hero-info">
                    <h2 className="profile-username">@{data.user.username}</h2>
                    {data.user.bio && (
                      <p className="pp-bio">{data.user.bio}</p>
                    )}
                    <div className="profile-divider" />
                    <div className="profile-stats">
                      <div className="stat">
                        <span className="stat-num">{data.stats.following_count}</span>
                        <span className="stat-label">Following</span>
                      </div>
                      <div className="stat">
                        <span className="stat-num">{followersCount}</span>
                        <span className="stat-label">Followers</span>
                      </div>
                    </div>
                    <div className="profile-actions">
                      <button
                        className={isFollowing ? "btn-following" : "btn-follow"}
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {isFollowing
                          ? <><UserCheck size={15} /> Following</>
                          : <><UserPlus size={15} /> Follow</>
                        }
                      </button>
                      <button className="btn-support">
                        <Heart size={15} /> Support
                      </button>
                    </div>
                  </div>
                </div>

                <div className="section-divider" />

                {/* DONOR SUMMARY */}
                <div className="donor-summary">
                  <div className="donor-stat-row">
                    <span className="donor-label">Number of Donations:</span>
                    <span className="donor-value">{data.stats.donations_count}</span>
                  </div>
                </div>

                <div className="section-divider" />

                {/* DONATION HISTORY */}
                <div className="donation-history-section">
                  <h3 className="section-title">Donation History</h3>

                  {!data.user.show_donation_history ? (
                    <div className="pp-private">
                      <Lock size={22} strokeWidth={1.5} />
                      <p>This user's donation history is private.</p>
                    </div>
                  ) : data.donation_history.length === 0 ? (
                    <div className="donation-empty">
                      <div className="empty-icon"><Heart size={32} strokeWidth={1.5} /></div>
                      <p>No donations yet</p>
                      <span>This user hasn't made any donations yet.</span>
                    </div>
                  ) : (
                    <div className="donation-list">
                      {data.donation_history.map((d) => (
                        <div className="donation-item" key={d.donation_id}>
                          <div className="donation-amount">${parseFloat(d.amount).toFixed(2)}</div>
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

                <div className="section-divider" />

                {/* USER POSTS */}
                <div className="donation-history-section">
                  <h3 className="section-title">Posts</h3>
                  {posts.length === 0 ? (
                    <div className="donation-empty">
                      <div className="empty-icon"><Heart size={32} strokeWidth={1.5} /></div>
                      <p>No posts yet</p>
                      <span>This user hasn't posted anything yet.</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {posts.map(post => (
                        <PostCard
                          key={post.post_id}
                          post={post}
                          onLike={async (post_id) => {
                            const res = await fetch(`http://localhost:5000/api/posts/${post_id}/like`, { method: "POST", credentials: "include" })
                            const json = await res.json()
                            if (res.ok) setPosts(prev => prev.map(p => p.post_id === post_id ? { ...p, liked: json.liked, like_count: json.like_count } : p))
                          }}
                          navigate={navigate}
                          storedUsername={storedUsername}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANELS */}
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

        <CreatePostModal profileImage={myProfileImage} />
      </div>
    </div>
  )
}