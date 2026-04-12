import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/eventfeed.css"

import {
    LayoutDashboard, ZodiacSagittarius, Trophy, History,
    Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
    Heart, Target, Calendar,
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import defaultProfile from "../assets/images/default_profile.jpg"

const CATEGORIES = ["All", "Fundraiser", "Charity", "Education", "Healthcare", "Food Drive", "Orphanage", "Disaster Relief", "Community", "Other"]

export default function EventFeed() {
    const navigate = useNavigate()

    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [profileImage, setProfileImage] = useState(null)
    const [category, setCategory] = useState("All")

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true)
            try {
                const [profileRes, eventsRes] = await Promise.all([
                    fetch("http://localhost:5000/api/users/profile", { credentials: "include" }),
                    fetch(`http://localhost:5000/api/events?status=active${category !== "All" ? `&category=${category}` : ""}`, { credentials: "include" }),
                ])
                if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }
                const profileData = await profileRes.json()
                setProfileImage(profileData?.user?.profile_image || null)
                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json()
                    setEvents(eventsData.events || [])
                }
            } catch (err) { console.error(err) }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [navigate, category])

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <div className="sidebar">
                <div className="nav">
                    <div className="nav-item" onClick={() => navigate("/dashboard")}><LayoutDashboard className="nav-icon" />Dashboard</div>
                    <div className="nav-item ef-active"><ZodiacSagittarius className="nav-icon" />Explore</div>
                    <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
                    <div className="nav-item" onClick={() => navigate("/donor-history")}><History className="nav-icon" />Donor History</div>
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

            <div className="dashboard-card">
                <Topbar title="Explore Events" profileImage={profileImage} />

                <div className="ef-body">

                    {/* CATEGORY FILTER */}
                    <div className="ef-filters">
                        {CATEGORIES.map(c => (
                            <button
                                key={c}
                                className={`ef-filter-btn ${category === c ? "active" : ""}`}
                                onClick={() => setCategory(c)}
                            >
                                {c}
                            </button>
                        ))}
                    </div>

                    {/* EVENTS GRID */}
                    {loading ? (
                        <div className="ef-loading">Loading events...</div>
                    ) : events.length === 0 ? (
                        <div className="ef-empty">
                            <ZodiacSagittarius size={48} strokeWidth={1.2} />
                            <h3>No events found</h3>
                            <p>Try a different category or check back later.</p>
                        </div>
                    ) : (
                        <div className="ef-grid">
                            {events.map(event => (
                                <div
                                    key={event.event_id}
                                    className="ef-card"
                                    onClick={() => navigate(`/events/${event.event_id}`)}
                                >
                                    {/* COVER */}
                                    <div className="ef-card-cover">
                                        {event.cover_image
                                            ? <img src={event.cover_image} alt={event.title} />
                                            : <div className="ef-cover-placeholder"><Heart size={28} /></div>
                                        }
                                        <span className="ef-card-category">{event.category}</span>
                                    </div>

                                    {/* BODY */}
                                    <div className="ef-card-body">

                                        {/* CREATOR */}
                                        <div className="ef-card-creator">
                                            <img src={event.creator.profile_image || defaultProfile} alt={event.creator.username} className="ef-creator-avatar" />
                                            <span>@{event.creator.username}</span>
                                        </div>

                                        <h3 className="ef-card-title">{event.title}</h3>

                                        {event.description && (
                                            <p className="ef-card-desc">{event.description.slice(0, 100)}{event.description.length > 100 ? "..." : ""}</p>
                                        )}

                                        {/* PROGRESS */}
                                        <div className="ef-progress-bar">
                                            <div className="ef-progress-fill" style={{ width: `${event.progress}%` }} />
                                        </div>

                                        <div className="ef-card-stats">
                                            <span className="ef-raised">₹{parseFloat(event.current_amount).toLocaleString("en-IN")} raised</span>
                                            <span className="ef-pct">{event.progress}%</span>
                                        </div>

                                        <div className="ef-card-meta">
                                            <span><Target size={12} /> ₹{parseFloat(event.goal_amount).toLocaleString("en-IN")}</span>
                                            {event.end_date && (
                                                <span><Calendar size={12} /> {new Date(event.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                            )}
                                            <span><Heart size={12} /> {event.donations.length}</span>
                                        </div>

                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <CreatePostModal profileImage={profileImage} />
            </div>
        </div>
    )
}