import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/dashboard.css"

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
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"

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

export default function Dashboard(){

const [category,setCategory] = useState("Education")
const navigate = useNavigate()

return(

<div className="dashboard-wrapper">

<div className="background"></div>

<div className="brand">TruFund</div>

{/* SIDEBAR */}

<div className="sidebar">

  <div className="nav">
    <div className="nav-item"><LayoutDashboard className="nav-icon"/>Dashboard</div>
    <div className="nav-item"><ZodiacSagittarius className="nav-icon"/>Explore</div>
    <div className="nav-item"><Trophy className="nav-icon"/>Leaderboard</div>
    <div className="nav-item" onClick={() => navigate("/donor-history")}>
        <History className="nav-icon" />Donor History
    </div>
    <div className="nav-item" onClick={() => navigate("/following")}><Blend className="nav-icon"/>Following</div>
    <div className="nav-item"><KeyboardMusic className="nav-icon"/>Creator Studio</div>
  </div>

  <div className="support">
    <p>Support</p>
    <div className="nav-item"><Users className="nav-icon"/>Community</div>
    <div className="nav-item"><Settings className="nav-icon"/>Settings</div>
    <div className="nav-item"><MessageCircleQuestionMark className="nav-icon"/>Help & Support</div>
  </div>

</div>


{/* MAIN DASHBOARD CARD */}

<div className="dashboard-card">

  {/* TOPBAR */}

  <Topbar title="Dashboard" />


  {/* BODY */}

  <div className="dashboard-body">

    {/* LEFT */}

    <div className="dashboard-left">

      <div className="hero">
        <h1>TruFund</h1>
        <p className="hero-text">
          TruFund is a community-driven crowdfunding platform that connects individuals, organizations, and donors to support meaningful causes. It enables users to create campaigns for education, healthcare, community development, and more. Through transparency and engagement, TruFund helps people raise funds, inspire contributions, and create real social impact together.
        </p>
        <button className="learn">Learn More</button>
      </div>

      <div className="categories">
        {["Education","Orphanages","Food Donation","Mental Health"].map((c)=>(
          <button
            key={c}
            className={category===c ? "active" : ""}
            onClick={()=> category!==c && setCategory(c)}
            disabled={category===c}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="following">
        <h3>Your Following</h3>
        <div className="cards">
          <div className="card"></div>
          <div className="card"></div>
          <div className="card"></div>
          <div className="card"></div>
        </div>
      </div>

    </div>


    {/* RIGHT — Top Events + Trending as true siblings */}

    <div className="dashboard-right">

      <div className="panel">
        <div className="panel-header">
          <h3>Top Events</h3>
          <span className="panel-more">•••</span>
        </div>
        {mockTopEvents.map((e,i)=>(
          <div className="profile-event-item" key={i}>
            <div className="event-avatar-placeholder"/>
            <div className="event-info">
              <span className="event-org">{e.org}</span>
              <span className="event-name">{e.event}</span>
              <div className="event-progress-bar">
                <div className="event-progress-fill" style={{width:`${e.progress}%`}}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Trending</h3>
          <span className="panel-more">•••</span>
        </div>
        {mockTrending.map((t,i)=>(
          <div className="trending-item" key={i}>
            <div className="trending-avatar"/>
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

  <CreatePostModal />

</div>

</div>

)
}