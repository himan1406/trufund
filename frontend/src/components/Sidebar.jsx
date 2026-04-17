import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import API_BASE_URL from "../utils/api"
import {
  LayoutDashboard,
  Compass,
  Trophy,
  History,
  Users,
  KeyboardMusic,
  Settings,
  HelpCircle,
  PanelRight,
  AlignVerticalDistributeCenter,
} from "lucide-react"
import "../styles/sidebar.css"

export default function Sidebar({ activePage }) {
  const navigate = useNavigate()
  
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingProofs, setPendingProofs] = useState(0)
  const [pendingVerifs, setPendingVerifs] = useState(0)



  useEffect(() => {
    // We check profile to confirm if user is an admin
    const checkAdmin = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/profile`, { credentials: "include" })
        if (res.ok) {
          const data = await res.json()
          if (data.user?.is_admin) {
            setIsAdmin(true)
            // Fetch pending counts
            const countRes = await fetch(`${API_BASE_URL}/api/users/admin/pending-counts`, { credentials: "include" })
            if (countRes.ok) {
              const countData = await countRes.json()
              setPendingProofs(countData.pending_proofs || 0)
              setPendingVerifs(countData.pending_verifications || 0)
            }
          }
        }
      } catch (err) { console.error(err) }
    }
    checkAdmin()
  }, [])

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { id: "explore", label: "Explore", icon: Compass, path: "/events" },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
    { id: "history", label: "Donor History", icon: History, path: "/donor-history" },
    { id: "following", label: "Following", icon: Users, path: "/following" },
    { id: "creator", label: "Creator Studio", icon: KeyboardMusic, path: "/creator-studio" },
  ]

  const adminItems = [
    { id: "admin-submissions", label: "Event Submissions", icon: PanelRight, path: "/admin?tab=proofs", badge: pendingProofs },
    { id: "admin-verifications", label: "Verifications", icon: AlignVerticalDistributeCenter, path: "/admin?tab=verifications", badge: pendingVerifs },
  ]

  const supportItems = [
    { id: "community", label: "Community (Soon)", icon: Users, path: "#" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
    { id: "help", label: "Help & Support", icon: HelpCircle, path: "/help" },
  ]

  return (
    <div className="sidebar">
      <div className="nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="nav-icon" />
            {item.label}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="support admin-nav">
          <p>Admin Controls</p>
          {adminItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="nav-icon" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span className="sidebar-badge">{item.badge}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="support">
        <p>Support</p>
        {supportItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon className="nav-icon" />
            {item.label}
          </div>
        ))}
      </div>


    </div>
  )
}
