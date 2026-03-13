import { useState } from "react"
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
Search,
CircleArrowDown,
Bell
} from "lucide-react"

import defaultProfile from "../assets/images/default_profile.jpg"

export default function Dashboard(){

const [category,setCategory] = useState("Education")
const [menuOpen,setMenuOpen] = useState(false)

const username = localStorage.getItem("username") || "Username"

return(

<div className="dashboard-wrapper">

<div className="background"></div>

<div className="brand">
TruFund
</div>

{/* SIDEBAR */}

<div className="sidebar">

<div className="nav">

<div className="nav-item"><LayoutDashboard className="nav-icon"/>Dashboard</div>
<div className="nav-item"><ZodiacSagittarius className="nav-icon"/>Explore</div>
<div className="nav-item"><Trophy className="nav-icon"/>Leaderboard</div>
<div className="nav-item"><History className="nav-icon"/>Donor History</div>
<div className="nav-item"><Blend className="nav-icon"/>Following</div>
<div className="nav-item"><KeyboardMusic className="nav-icon"/>Creator Studio</div>

</div>

<div className="support">

<p>Support</p>

<div className="nav-item"><Users className="nav-icon"/>Community</div>
<div className="nav-item"><Settings className="nav-icon"/>Settings</div>
<div className="nav-item"><MessageCircleQuestionMark className="nav-icon"/>Help & Support</div>

</div>

</div>


{/* MAIN DASHBOARD */}

<div className="dashboard-card">

{/* TOPBAR */}

<div className="topbar">

<h2>Dashboard</h2>

<div className="search-container">

<Search className="search-icon"/>

<input
className="search"
placeholder="Search Events, NGOs, People"
/>

</div>


<div className="profile">

<Bell className="notification-icon"/>

<div className="profile-dropdown">

<CircleArrowDown
className="profile-icon"
onClick={()=>setMenuOpen(!menuOpen)}
/>

<span className="username">{username}</span>

<img
src={defaultProfile}
alt="profile"
className="profile-avatar"
/>

{menuOpen && (

<div className="dropdown-menu">

<div className="dropdown-item">
Profile
</div>

<div className="dropdown-item">
Edit Profile
</div>

</div>

)}

</div>

</div>

</div>


{/* HERO + EVENTS */}

<div className="hero-row">

<div className="hero">

<h1>TruFund</h1>

<p className="hero-text">
TruFund is a community-driven crowdfunding platform that connects individuals, organizations, and donors to support meaningful causes. It enables users to create campaigns for education, healthcare, community development, and more. Through transparency and engagement, TruFund helps people raise funds, inspire contributions, and create real social impact together.
</p>

<button className="learn">
Learn More
</button>

</div>

<div className="events-panel">

<h3>Top Events</h3>

<div className="event"></div>
<div className="event"></div>
<div className="event"></div>
<div className="event"></div>

</div>

</div>


{/* CATEGORY FILTER */}

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


{/* CONTENT */}

<div className="content">

<div className="following">

<h3>Your Following</h3>

<div className="cards">

<div className="card"></div>
<div className="card"></div>
<div className="card"></div>
<div className="card"></div>

</div>

</div>

<div className="right">

<div className="panel">

<h3>Trending</h3>

<div className="event"></div>
<div className="event"></div>
<div className="event"></div>

</div>

</div>

</div>

</div>

</div>

)
}