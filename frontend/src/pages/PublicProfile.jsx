import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import "../styles/publicprofile.css"

import {
  Heart, UserPlus, UserCheck, Lock,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/Topbar"
import VerifiedBadge from "../components/VerifiedBadge"
import CreatePostModal from "../components/CreatePostModal"
import { PostCard } from "../pages/HashtagFeed"
import API_BASE_URL from "../utils/api"
import defaultProfile from "../assets/images/default_profile.jpg"

export default function PublicProfile() {
  const { username } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading]   = useState(false)
  const [myProfileImage, setMyProfileImage] = useState(null)
  const [posts, setPosts]                   = useState([])
  const [topEvents, setTopEvents]           = useState([])
  const [trendingTags, setTrending]         = useState([])

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

        /* fetch this user's posts + top events + trending */
        const [postsRes, eventsRes, hashRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/posts/user/${username}`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/api/events?status=active&limit=5`, { credentials: "include" }),
          fetch(`${API_BASE_URL}/api/posts/trending/hashtags`, { credentials: "include" }),
        ])
        if (postsRes.ok)  { const d = await postsRes.json();  setPosts(d.posts || []) }
        if (eventsRes.ok) { const d = await eventsRes.json(); setTopEvents(d.events || []) }
        if (hashRes.ok)   { const d = await hashRes.json();   setTrending(d.hashtags || []) }
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

      <Sidebar />

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
                    <h2 className="profile-username">
                    @{data.user.username}
                    <VerifiedBadge isVerified={data.user.is_verified_org} isAdmin={data.user.is_admin} size={18} />
                  </h2>
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
                          <div className="donation-amount">₹{parseFloat(d.amount).toLocaleString("en-IN")}</div>
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
                <span className="panel-more" onClick={() => navigate("/events")} style={{cursor:"pointer"}}>See all</span>
              </div>
              {topEvents.length === 0
                ? <p style={{fontFamily:"Montserrat",fontSize:12,color:"#aaa",padding:"8px 0"}}>No active events yet</p>
                : topEvents.map((e, i) => (
                  <div className="profile-event-item" key={i} onClick={() => navigate(`/events/${e.event_id}`)} style={{cursor:"pointer"}}>
                    <div className="event-avatar-placeholder" style={{overflow:"hidden",background:e.cover_image?"none":"#d0d0d0"}}>
                      {e.cover_image && <img src={e.cover_image} alt={e.title} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />}
                    </div>
                    <div className="event-info">
                      <span className="event-org">@{e.creator?.username || "org"}</span>
                      <span className="event-name">{e.title}</span>
                      <div className="event-progress-bar"><div className="event-progress-fill" style={{ width: `${e.progress}%` }} /></div>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="profile-panel trending-panel">
              <div className="panel-header"><h3>Trending Hashtags</h3><span className="panel-more">•••</span></div>
              {(trendingTags.length > 0 ? trendingTags.slice(0,5) : ["crowdfunding","donate","charity","helpothers","community"].map(t=>({tag:t,post_count:0}))).map((t, i) => (
                <div className="trending-item" key={i} onClick={() => navigate(`/hashtag/${t.tag}`)} style={{cursor:"pointer"}}>
                  <div className="trending-avatar" style={{background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",color:"#1c4e14",fontWeight:700,fontSize:16}}>#</div>
                  <div className="trending-info">
                    <span className="trending-title">#{t.tag}</span>
                    <span className="trending-sub">{t.post_count > 0 ? `${t.post_count} posts` : "Explore"}</span>
                  </div>
                  <button className="trending-play" onClick={ev => { ev.stopPropagation(); navigate(`/hashtag/${t.tag}`) }}>→</button>
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