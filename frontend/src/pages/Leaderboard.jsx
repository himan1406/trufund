import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/leaderboard.css"

import {
  Medal, Crown, Heart, TrendingUp, Trophy
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import defaultProfile from "../assets/images/default_profile.jpg"

const pool_url = "http://localhost:5000"

export default function Leaderboard() {
  const navigate = useNavigate()

  const [tab, setTab]                     = useState("total")   // total | single
  const [topDonors, setTopDonors]         = useState([])
  const [topSingle, setTopSingle]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [profileImage, setProfileImage]   = useState(null)
  const [myUserId, setMyUserId]           = useState(null)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, totalRes, singleRes] = await Promise.all([
          fetch(`${pool_url}/api/users/profile`,          { credentials: "include" }),
          fetch(`${pool_url}/api/users/leaderboard/total`,  { credentials: "include" }),
          fetch(`${pool_url}/api/users/leaderboard/single`, { credentials: "include" }),
        ])

        if (!profileRes.ok) {
          if (profileRes.status === 401) { navigate("/login"); return }
        }
        const profileData = await profileRes.json()
        setProfileImage(profileData?.user?.profile_image || null)
        setMyUserId(profileData?.user?.user_id || null)

        if (totalRes.ok)  { const d = await totalRes.json();  setTopDonors(d.leaderboard || []) }
        if (singleRes.ok) { const d = await singleRes.json(); setTopSingle(d.leaderboard || []) }
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [navigate])

  const MEDAL_COLORS = ["#f4c430", "#b0b0b0", "#cd7f32"]
  const MEDAL_LABELS = ["🥇", "🥈", "🥉"]

  const entries = tab === "total" ? topDonors : topSingle

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <Sidebar activePage="leaderboard" />

      <div className="dashboard-card">
        <Topbar title="Leaderboard" profileImage={profileImage} />

        <div className="lb-body">

          {/* HEADER */}
          <div className="lb-header">
            <div className="lb-header-left">
              <Crown size={24} className="lb-crown" />
              <div>
                <h2 className="lb-title">Top Donors</h2>
                <p className="lb-subtitle">Recognising TruFund's most generous contributors</p>
              </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="lb-tabs">
              <button
                className={`lb-tab ${tab === "total" ? "active" : ""}`}
                onClick={() => setTab("total")}
              >
                <TrendingUp size={14} />
                Most Donated
              </button>
              <button
                className={`lb-tab ${tab === "single" ? "active" : ""}`}
                onClick={() => setTab("single")}
              >
                <Heart size={14} />
                Biggest Gift
              </button>
            </div>
          </div>

          {loading ? (
            <div className="lb-loading">Loading leaderboard...</div>
          ) : (!Array.isArray(entries) || entries.length === 0) ? (
            <div className="lb-empty">
              <Trophy size={52} strokeWidth={1.2} />
              <h3>No donations yet</h3>
              <p>Be the first to donate and claim the top spot!</p>
              <button className="lb-cta" onClick={() => navigate("/events")}>Browse Events →</button>
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM */}
              {Array.isArray(entries) && entries.length >= 3 && entries[0] && entries[1] && entries[2] && (
                <div className="lb-podium">
                  {/* 2nd */}
                  <div className="lb-podium-slot second" onClick={() => navigate(`/profile/${entries[1]?.username}`)}>
                    <div className="lb-podium-medal">🥈</div>
                    <img src={entries[1]?.profile_image || defaultProfile} alt={entries[1]?.username || "User"} className="lb-podium-avatar" />
                    <span className="lb-podium-username">@{entries[1]?.username || "anonymous"}</span>
                    <span className="lb-podium-amount">
                      ₹{parseFloat(tab === "total" ? (entries[1]?.total_donated || 0) : (entries[1]?.max_donation || 0)).toLocaleString("en-IN")}
                    </span>
                    <div className="lb-podium-bar second-bar" />
                  </div>

                  {/* 1st */}
                  <div className="lb-podium-slot first" onClick={() => navigate(`/profile/${entries[0]?.username}`)}>
                    <div className="lb-podium-crown">👑</div>
                    <div className="lb-podium-medal">🥇</div>
                    <img src={entries[0]?.profile_image || defaultProfile} alt={entries[0]?.username || "User"} className="lb-podium-avatar lb-podium-avatar-first" />
                    <span className="lb-podium-username">@{entries[0]?.username || "anonymous"}</span>
                    <span className="lb-podium-amount">
                      ₹{parseFloat(tab === "total" ? (entries[0]?.total_donated || 0) : (entries[0]?.max_donation || 0)).toLocaleString("en-IN")}
                    </span>
                    <div className="lb-podium-bar first-bar" />
                  </div>

                  {/* 3rd */}
                  <div className="lb-podium-slot third" onClick={() => navigate(`/profile/${entries[2]?.username}`)}>
                    <div className="lb-podium-medal">🥉</div>
                    <img src={entries[2]?.profile_image || defaultProfile} alt={entries[2]?.username || "User"} className="lb-podium-avatar" />
                    <span className="lb-podium-username">@{entries[2]?.username || "anonymous"}</span>
                    <span className="lb-podium-amount">
                      ₹{parseFloat(tab === "total" ? (entries[2]?.total_donated || 0) : (entries[2]?.max_donation || 0)).toLocaleString("en-IN")}
                    </span>
                    <div className="lb-podium-bar third-bar" />
                  </div>
                </div>
              )}

              {/* FULL LIST */}
              <div className="lb-list">
                {Array.isArray(entries) && entries.map((entry, idx) => {
                  if (!entry) return null
                  const isMe = entry.user_id === myUserId
                  const amount = parseFloat(tab === "total" ? (entry.total_donated || 0) : (entry.max_donation || 0))
                  const topAmount = parseFloat(tab === "total" ? (entries[0]?.total_donated || 0) : (entries[0]?.max_donation || 0))
                  const barWidth = topAmount > 0 ? Math.max(8, Math.round((amount / topAmount) * 100)) : 8

                  return (
                    <div
                      key={entry.user_id || idx}
                      className={`lb-row ${isMe ? "lb-row-me" : ""}`}
                      onClick={() => navigate(`/profile/${entry.username}`)}
                    >
                      {/* RANK */}
                      <div className="lb-rank">
                        {idx < 3
                          ? <span className="lb-rank-medal">{MEDAL_LABELS[idx]}</span>
                          : <span className="lb-rank-num">{idx + 1}</span>
                        }
                      </div>

                      {/* AVATAR */}
                      <img
                        src={entry.profile_image || defaultProfile}
                        alt={entry.username}
                        className="lb-avatar"
                      />

                      {/* INFO */}
                      <div className="lb-info">
                        <div className="lb-info-top">
                          <span className="lb-username">
                            @{entry.username || "anonymous"}
                            {isMe && <span className="lb-you-badge">You</span>}
                          </span>
                          <span className="lb-amount">
                            ₹{amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="lb-bar-wrap">
                          <div className="lb-bar-fill" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="lb-meta">
                          {tab === "total"
                            ? `${entry.donation_count} donation${entry.donation_count !== 1 ? "s" : ""}`
                            : `To: ${entry.event_title}`
                          }
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <CreatePostModal profileImage={profileImage} />
      </div>
    </div>
  )
}