import { useState, useEffect } from "react"
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

export default function Dashboard(){

const [category, setCategory]     = useState("Education")
const [topEvents, setTopEvents]   = useState([])
const [following, setFollowing]   = useState([])
const [trendingTags, setTrending] = useState([])
const navigate = useNavigate()

useEffect(() => {
  const fetchAll = async () => {
    try {
      const [eventsRes, followRes, hashRes] = await Promise.all([
        fetch("http://localhost:5000/api/events?status=active&limit=5", { credentials: "include" }),
        fetch("http://localhost:5000/api/users/following", { credentials: "include" }),
        fetch("http://localhost:5000/api/posts/trending/hashtags", { credentials: "include" }),
      ])
      if (eventsRes.ok)  { const d = await eventsRes.json();  setTopEvents(d.events || []) }
      if (followRes.ok)  { const d = await followRes.json();  setFollowing(d.following || []) }
      if (hashRes.ok)    { const d = await hashRes.json();    setTrending(d.hashtags || []) }
    } catch (err) { console.error(err) }
  }
  fetchAll()
}, [])

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
        {following.length === 0 ? (
          <p className="following-empty">Follow people to see them here. <span onClick={() => navigate("/events")} style={{color:"#1c4e14",cursor:"pointer",fontWeight:700}}>Explore events →</span></p>
        ) : (
          <div className="cards">
            {following.slice(0, 4).map(u => (
              <div className="card following-card" key={u.user_id} onClick={() => navigate(`/profile/${u.username}`)}>
                <img src={u.profile_image || "/src/assets/images/default_profile.jpg"} alt={u.username} className="following-card-avatar" />
                <span className="following-card-name">@{u.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>


    {/* RIGHT — Top Events + Trending as true siblings */}

    <div className="dashboard-right">

      <div className="panel">
        <div className="panel-header">
          <h3>Top Events</h3>
          <span className="panel-more">•••</span>
        </div>
        {topEvents.length === 0 ? (
          <p style={{fontFamily:"Montserrat",fontSize:12,color:"#aaa",padding:"8px 0"}}>No active events yet</p>
        ) : topEvents.map((e,i) => (
          <div className="profile-event-item" key={i} onClick={() => navigate(`/events/${e.event_id}`)} style={{cursor:"pointer"}}>
            <div className="event-avatar-placeholder" style={{background: e.cover_image ? "none" : "#ddd", overflow:"hidden"}}>
              {e.cover_image && <img src={e.cover_image} alt={e.title} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} />}
            </div>
            <div className="event-info">
              <span className="event-org">@{e.creator?.username || "org"}</span>
              <span className="event-name">{e.title}</span>
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
        {trendingTags.length === 0
          ? ["crowdfunding","donate","charity","helpothers","community"].map(t => (
              <div className="trending-item" key={t} onClick={() => navigate(`/hashtag/${t}`)} style={{cursor:"pointer"}}>
                <div className="trending-avatar" style={{background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",color:"#1c4e14",fontWeight:700,fontSize:16}}>#</div>
                <div className="trending-info">
                  <span className="trending-title">#{t}</span>
                  <span className="trending-sub">Trending</span>
                </div>
                <button className="trending-play" onClick={e => { e.stopPropagation(); navigate(`/hashtag/${t}`) }}>→</button>
              </div>
            ))
          : trendingTags.slice(0, 5).map((t, i) => (
              <div className="trending-item" key={i} onClick={() => navigate(`/hashtag/${t.tag}`)} style={{cursor:"pointer"}}>
                <div className="trending-avatar" style={{background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",color:"#1c4e14",fontWeight:700,fontSize:16}}>#</div>
                <div className="trending-info">
                  <span className="trending-title">#{t.tag}</span>
                  <span className="trending-sub">{t.post_count} post{t.post_count !== 1 ? "s" : ""}</span>
                </div>
                <button className="trending-play" onClick={e => { e.stopPropagation(); navigate(`/hashtag/${t.tag}`) }}>→</button>
              </div>
            ))
        }
      </div>

    </div>

  </div>

  <CreatePostModal />

</div>

</div>

)
}