import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/donorhistory.css"

import {
  Heart,
  TrendingUp,
  Calendar,
  DollarSign,
  Filter,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/TopBar"
import CreatePostModal from "../components/CreatePostModal"

import API_BASE_URL from "../utils/api"

export default function DonorHistory() {

  const [menuOpen, setMenuOpen] = useState(false)
  const [profileData, setProfileData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("All")

  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
          credentials: "include",
        })
        if (!res.ok) {
          if (res.status === 401) { navigate("/login"); return }
          throw new Error("Failed to load")
        }
        const data = await res.json()
        setProfileData(data)
      } catch (err) {
        setError("Could not load donation history.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [navigate])

  const donations = profileData?.donation_history || []
  const stats = profileData?.stats || { donations_count: 0 }

  /* total amount donated */
  const totalDonated = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0)

  /* unique campaigns supported */
  const uniqueCampaigns = new Set(donations.map(d => d.event_id)).size

  /* filter categories derived from donation data */
  const filterOptions = ["All", ...new Set(donations.map(d => d.event_title))]

  const filtered = filter === "All"
    ? donations
    : donations.filter(d => d.event_title === filter)

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <Sidebar activePage="history" />

      {/* MAIN CARD */}
      <div className="dashboard-card">

        {/* TOPBAR */}
        <Topbar title="Donor History" profileImage={profileData?.user?.profile_image} />

        {/* BODY */}
        <div className="dh-body">

          {loading ? (

            <div className="dh-loading">Loading your donation history...</div>

          ) : error ? (

            <div className="dh-error">{error}</div>

          ) : (
            <>

              {/* STAT CARDS ROW */}
              <div className="dh-stats-row">

                <div className="dh-stat-card">
                  <div className="dh-stat-icon-wrap green">
                    <Heart size={20} />
                  </div>
                  <div className="dh-stat-info">
                    <span className="dh-stat-num">{stats.donations_count}</span>
                    <span className="dh-stat-label">Total Donations</span>
                  </div>
                </div>

                <div className="dh-stat-card">
                  <div className="dh-stat-icon-wrap blue">
                    <DollarSign size={20} />
                  </div>
                  <div className="dh-stat-info">
                    <span className="dh-stat-num">₹{totalDonated.toLocaleString("en-IN")}</span>
                    <span className="dh-stat-label">Total Contributed</span>
                  </div>
                </div>

                <div className="dh-stat-card">
                  <div className="dh-stat-icon-wrap teal">
                    <TrendingUp size={20} />
                  </div>
                  <div className="dh-stat-info">
                    <span className="dh-stat-num">{uniqueCampaigns}</span>
                    <span className="dh-stat-label">Campaigns Supported</span>
                  </div>
                </div>

                <div className="dh-stat-card">
                  <div className="dh-stat-icon-wrap gold">
                    <Calendar size={20} />
                  </div>
                  <div className="dh-stat-info">
                    <span className="dh-stat-num">
                      {donations.length > 0
                        ? new Date(donations[donations.length - 1].donated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                        : "—"}
                    </span>
                    <span className="dh-stat-label">First Donation</span>
                  </div>
                </div>

              </div>

              {/* FILTER BAR */}
              {donations.length > 0 && (
                <div className="dh-filter-bar">
                  <Filter size={14} className="dh-filter-icon" />
                  <div className="dh-filters">
                    {["All", ...new Set(donations.map(d => d.event_title))].map(f => (
                      <button
                        key={f}
                        className={filter === f ? "dh-filter-btn active" : "dh-filter-btn"}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DONATION LIST */}
              {donations.length === 0 ? (

                <div className="dh-empty">
                  <div className="dh-empty-icon"><Heart size={48} strokeWidth={1} /></div>
                  <h3>No donations yet</h3>
                  <p>When you donate to a campaign, your history will show up here.</p>
                  <button className="dh-explore-btn" onClick={() => navigate("/dashboard")}>
                    Explore Campaigns
                  </button>
                </div>

              ) : (

                <div className="dh-list">
                  {filtered.map((d, i) => (
                    <div className="dh-item" key={d.donation_id} style={{ animationDelay: `${i * 0.05}s` }}>

                      <div className="dh-item-left">
                        <div className="dh-amount-badge">
                          ₹{parseFloat(d.amount).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div className="dh-item-center">
                        <span className="dh-campaign-name">{d.event_title}</span>
                        {d.message && (
                          <span className="dh-message">"{d.message}"</span>
                        )}
                      </div>

                      <div className="dh-item-right">
                        <span className="dh-date">
                          {new Date(d.donated_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                        <div className="dh-tag">Completed</div>
                      </div>

                    </div>
                  ))}
                </div>

              )}

            </>
          )}

        </div>

        <CreatePostModal profileImage={profileData?.user?.profile_image} />
      </div>
    </div>
  )
}
