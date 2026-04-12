import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/creatorstudio.css"

import {
    LayoutDashboard, ZodiacSagittarius, Trophy, History,
    Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
    Plus, ImagePlus, X, Trash2, Calendar, Target, TrendingUp, Eye,
} from "lucide-react"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"

const CATEGORIES = ["Fundraiser", "Charity", "Education", "Healthcare", "Food Drive", "Orphanage", "Disaster Relief", "Community", "Other"]

export default function CreatorStudio() {
    const navigate = useNavigate()

    const [myEvents, setMyEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [profileImage, setProfileImage] = useState(null)
    const [showForm, setShowForm] = useState(false)

    /* form state */
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("Fundraiser")
    const [goalAmount, setGoalAmount] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [files, setFiles] = useState([])
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState("")
    const fileInputRef = useRef(null)

    /* milestone state — 3 milestones by default, org can add up to 5 */
    const [milestones, setMilestones] = useState([
        { title: "", description: "", percentage_amount: "" },
        { title: "", description: "", percentage_amount: "" },
        { title: "", description: "", percentage_amount: "" },
    ])
    const milestoneTotal = milestones.reduce((sum, m) => sum + (parseFloat(m.percentage_amount) || 0), 0)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, eventsRes] = await Promise.all([
                    fetch("http://localhost:5000/api/users/profile", { credentials: "include" }),
                    fetch("http://localhost:5000/api/events/mine", { credentials: "include" }),
                ])
                if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }
                const profileData = await profileRes.json()
                setProfileImage(profileData?.user?.profile_image || null)
                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json()
                    setMyEvents(eventsData.events || [])
                }
            } catch (err) { console.error(err) }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [navigate])

    const handleFilePick = (e) => {
        const picked = Array.from(e.target.files)
        if (!picked.length) return
        const newFiles = picked.map(f => ({
            file: f,
            preview: URL.createObjectURL(f),
            type: f.type.startsWith("video") ? "video" : "image",
        }))
        setFiles(prev => [...prev, ...newFiles].slice(0, 10))
        e.target.value = ""
    }

    const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!title.trim()) { setFormError("Title is required"); return }
        if (!goalAmount || parseFloat(goalAmount) <= 0) { setFormError("A valid donation goal is required"); return }

        /* validate milestones */
        const filledMilestones = milestones.filter(m => m.title.trim() || m.percentage_amount)
        if (filledMilestones.length < 2) { setFormError("Please set at least 2 milestones"); return }
        for (const m of filledMilestones) {
            if (!m.title.trim()) { setFormError("All milestones need a title"); return }
            if (!m.percentage_amount || parseFloat(m.percentage_amount) <= 0) { setFormError("All milestones need a percentage greater than 0"); return }
        }
        const total = filledMilestones.reduce((sum, m) => sum + parseFloat(m.percentage_amount || 0), 0)
        if (Math.abs(total - 100) > 0.01) { setFormError(`Milestone percentages must add up to 100%. Current total: ${total.toFixed(1)}%`); return }

        setSubmitting(true); setFormError("")

        try {
            const formData = new FormData()
            formData.append("title", title.trim())
            formData.append("description", description.trim())
            formData.append("category", category)
            formData.append("goal_amount", goalAmount)
            if (startDate) formData.append("start_date", startDate)
            if (endDate) formData.append("end_date", endDate)
            files.forEach(f => formData.append("media", f.file))

            const res = await fetch("http://localhost:5000/api/events", {
                method: "POST", credentials: "include", body: formData
            })
            const data = await res.json()
            if (!res.ok) { setFormError(data.error || "Failed to create event"); return }

            /* POST milestones for the new event */
            const milestoneRes = await fetch(`http://localhost:5000/api/escrow/events/${data.event.event_id}/milestones`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ milestones: filledMilestones }),
            })
            if (!milestoneRes.ok) {
                const milestoneErr = await milestoneRes.json()
                setFormError(milestoneErr.error || "Event created but milestones failed — please set them manually")
                return
            }

            setMyEvents(prev => [data.event, ...prev])
            setShowForm(false)
            resetForm()
        } catch { setFormError("Server error. Try again.") }
        finally { setSubmitting(false) }
    }

    const resetForm = () => {
        setTitle(""); setDescription(""); setCategory("Fundraiser")
        setGoalAmount(""); setStartDate(""); setEndDate("")
        setFiles([]); setFormError("")
        setMilestones([
            { title: "", description: "", percentage_amount: "" },
            { title: "", description: "", percentage_amount: "" },
            { title: "", description: "", percentage_amount: "" },
        ])
    }

    const handleDelete = async (event_id) => {
        if (!window.confirm("Delete this event? This cannot be undone.")) return
        try {
            const res = await fetch(`http://localhost:5000/api/events/${event_id}`, {
                method: "DELETE", credentials: "include"
            })
            if (res.ok) setMyEvents(prev => prev.filter(e => e.event_id !== event_id))
        } catch (err) { console.error(err) }
    }

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <div className="sidebar">
                <div className="nav">
                    <div className="nav-item" onClick={() => navigate("/dashboard")}><LayoutDashboard className="nav-icon" />Dashboard</div>
                    <div className="nav-item"><ZodiacSagittarius className="nav-icon" />Explore</div>
                    <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
                    <div className="nav-item" onClick={() => navigate("/donor-history")}><History className="nav-icon" />Donor History</div>
                    <div className="nav-item" onClick={() => navigate("/following")}><Blend className="nav-icon" />Following</div>
                    <div className="nav-item cs-active"><KeyboardMusic className="nav-icon" />Creator Studio</div>
                </div>
                <div className="support">
                    <p>Support</p>
                    <div className="nav-item"><Users className="nav-icon" />Community</div>
                    <div className="nav-item"><Settings className="nav-icon" />Settings</div>
                    <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
                </div>
            </div>

            <div className="dashboard-card">
                <Topbar title="Creator Studio" profileImage={profileImage} />

                <div className="cs-body">

                    {/* HEADER ROW */}
                    <div className="cs-header-row">
                        <div>
                            <h2 className="cs-title">Your Events</h2>
                            <p className="cs-subtitle">{myEvents.length} event{myEvents.length !== 1 ? "s" : ""} created</p>
                        </div>
                        <button className="cs-create-btn" onClick={() => setShowForm(true)}>
                            <Plus size={16} /> Create Event
                        </button>
                    </div>

                    {/* CREATE EVENT FORM */}
                    {showForm && (
                        <div className="cs-form-overlay">
                            <div className="cs-form-card">
                                <div className="cs-form-header">
                                    <h3>Create New Event</h3>
                                    <button className="cs-form-close" onClick={() => { setShowForm(false); resetForm() }}>
                                        <X size={18} />
                                    </button>
                                </div>

                                <form className="cs-form" onSubmit={handleCreate}>
                                    <div className="cs-form-grid">

                                        <div className="cs-field cs-field-full">
                                            <label>Event Title *</label>
                                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Big Feed Drive 2025" />
                                        </div>

                                        <div className="cs-field cs-field-full">
                                            <label>Description</label>
                                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell people what this event is about..." rows={4} />
                                        </div>

                                        <div className="cs-field">
                                            <label>Category</label>
                                            <select value={category} onChange={e => setCategory(e.target.value)}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <div className="cs-field">
                                            <label>Donation Goal (₹) *</label>
                                            <input type="number" min="1" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} placeholder="e.g. 50000" />
                                        </div>

                                        <div className="cs-field">
                                            <label>Start Date</label>
                                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                        </div>

                                        <div className="cs-field">
                                            <label>End Date</label>
                                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                        </div>

                                    </div>

                                    {/* MILESTONE SECTION */}
                                    <div className="cs-field cs-field-full">
                                        <label>
                                            Funding Milestones * — total must equal 100%
                                            <span className={`cs-milestone-total ${Math.abs(milestoneTotal - 100) < 0.01 ? "valid" : milestoneTotal > 0 ? "invalid" : ""}`}>
                                                {milestoneTotal > 0 ? ` (${milestoneTotal.toFixed(1)}%)` : ""}
                                            </span>
                                        </label>
                                        {milestones.map((m, i) => (
                                            <div key={i} className="cs-milestone-row">
                                                <span className="cs-milestone-num">{i + 1}</span>
                                                <input
                                                    type="text"
                                                    className="cs-milestone-title"
                                                    placeholder={`Milestone ${i + 1} title (e.g. Purchase supplies)`}
                                                    value={m.title}
                                                    onChange={e => setMilestones(prev => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                                                />
                                                <input
                                                    type="number"
                                                    className="cs-milestone-pct"
                                                    placeholder="%"
                                                    min="1"
                                                    max="100"
                                                    value={m.percentage_amount}
                                                    onChange={e => setMilestones(prev => prev.map((x, idx) => idx === i ? { ...x, percentage_amount: e.target.value } : x))}
                                                />
                                                {milestones.length > 2 && (
                                                    <button
                                                        type="button"
                                                        className="cs-milestone-remove"
                                                        onClick={() => setMilestones(prev => prev.filter((_, idx) => idx !== i))}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {milestones.length < 5 && (
                                            <button
                                                type="button"
                                                className="cs-milestone-add"
                                                onClick={() => setMilestones(prev => [...prev, { title: "", description: "", percentage_amount: "" }])}
                                            >
                                                + Add Milestone
                                            </button>
                                        )}
                                    </div>

                                    {/* MEDIA UPLOAD */}
                                    <div className="cs-media-section">
                                        <label>Photos & Posters (first image becomes cover)</label>
                                        <div className="cs-media-row">
                                            {files.map((f, i) => (
                                                <div key={i} className="cs-preview-wrap">
                                                    {f.type === "video"
                                                        ? <video src={f.preview} className="cs-preview" />
                                                        : <img src={f.preview} alt="preview" className="cs-preview" />
                                                    }
                                                    <button type="button" className="cs-preview-remove" onClick={() => removeFile(i)}><X size={11} /></button>
                                                </div>
                                            ))}
                                            {files.length < 10 && (
                                                <button type="button" className="cs-add-media" onClick={() => fileInputRef.current.click()}>
                                                    <ImagePlus size={22} />
                                                    <span>Add Media</span>
                                                </button>
                                            )}
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple style={{ display: "none" }} onChange={handleFilePick} />
                                    </div>

                                    {formError && <p className="cs-form-error">{formError}</p>}

                                    <div className="cs-form-actions">
                                        <button type="button" className="cs-btn-ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancel</button>
                                        <button type="submit" className="cs-btn-primary" disabled={submitting}>
                                            {submitting ? "Creating..." : "Create Event"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* EVENTS LIST */}
                    {loading ? (
                        <div className="cs-loading">Loading your events...</div>
                    ) : myEvents.length === 0 ? (
                        <div className="cs-empty">
                            <KeyboardMusic size={48} strokeWidth={1.2} />
                            <h3>No events yet</h3>
                            <p>Create your first fundraiser or charity event to start collecting donations.</p>
                            <button className="cs-create-btn" onClick={() => setShowForm(true)}>
                                <Plus size={16} /> Create Your First Event
                            </button>
                        </div>
                    ) : (
                        <div className="cs-events-list">
                            {myEvents.map(event => (
                                <div className="cs-event-card" key={event.event_id}>

                                    {/* COVER */}
                                    <div className="cs-event-cover" onClick={() => navigate(`/events/${event.event_id}`)}>
                                        {event.cover_image
                                            ? <img src={event.cover_image} alt={event.title} />
                                            : <div className="cs-event-cover-placeholder"><KeyboardMusic size={32} /></div>
                                        }
                                        <div className={`cs-event-status ${event.status}`}>{event.status}</div>
                                    </div>

                                    {/* INFO */}
                                    <div className="cs-event-info">
                                        <h3 className="cs-event-title" onClick={() => navigate(`/events/${event.event_id}`)}>{event.title}</h3>
                                        <span className="cs-event-category">{event.category}</span>

                                        {/* PROGRESS BAR */}
                                        <div className="cs-progress-wrap">
                                            <div className="cs-progress-bar">
                                                <div className="cs-progress-fill" style={{ width: `${event.progress}%` }} />
                                            </div>
                                            <div className="cs-progress-labels">
                                                <span className="cs-raised">₹{parseFloat(event.current_amount).toLocaleString("en-IN")} raised</span>
                                                <span className="cs-goal">of ₹{parseFloat(event.goal_amount).toLocaleString("en-IN")}</span>
                                            </div>
                                        </div>

                                        {/* STATS */}
                                        <div className="cs-event-stats">
                                            <div className="cs-stat"><TrendingUp size={13} />{event.progress}%</div>
                                            <div className="cs-stat"><Target size={13} />₹{parseFloat(event.goal_amount).toLocaleString("en-IN")}</div>
                                            <div className="cs-stat"><Calendar size={13} />{event.end_date ? new Date(event.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "No end date"}</div>
                                        </div>
                                    </div>

                                    {/* ACTIONS */}
                                    <div className="cs-event-actions">
                                        <button className="cs-btn-view" onClick={() => navigate(`/events/${event.event_id}`)}>
                                            <Eye size={14} /> View
                                        </button>
                                        <button className="cs-btn-delete" onClick={() => handleDelete(event.event_id)}>
                                            <Trash2 size={14} />
                                        </button>
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