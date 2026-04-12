import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/admindashboard.css"

import {
    LayoutDashboard, ZodiacSagittarius, Trophy, History,
    Blend, KeyboardMusic, Users, Settings, MessageCircleQuestionMark,
    CheckCircle, XCircle, Eye, Clock, Shield,
} from "lucide-react"

import Topbar from "../components/Topbar"
import defaultProfile from "../assets/images/default_profile.jpg"

export default function AdminDashboard() {
    const navigate = useNavigate()

    const [proofs, setProofs] = useState([])
    const [loading, setLoading] = useState(true)
    const [profileImage, setProfileImage] = useState(null)
    const [error, setError] = useState("")
    const [expanded, setExpanded] = useState(null)
    const [rejectNote, setRejectNote] = useState({})
    const [processing, setProcessing] = useState({})

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, proofsRes] = await Promise.all([
                    fetch("http://localhost:5000/api/users/profile", { credentials: "include" }),
                    fetch("http://localhost:5000/api/escrow/admin/proofs/pending", { credentials: "include" }),
                ])
                if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }
                const profileData = await profileRes.json()
                setProfileImage(profileData?.user?.profile_image || null)

                if (proofsRes.status === 403) { setError("You need admin access to view this page."); setLoading(false); return }
                if (!proofsRes.ok) throw new Error()
                const proofsData = await proofsRes.json()
                setProofs(proofsData.proofs || [])
            } catch { setError("Could not load pending proofs.") }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [navigate])

    const handleApprove = async (proof_id) => {
        setProcessing(prev => ({ ...prev, [proof_id]: "approving" }))
        try {
            const res = await fetch(`http://localhost:5000/api/escrow/admin/proofs/${proof_id}/approve`, {
                method: "POST", credentials: "include"
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed to approve"); return }
            setProofs(prev => prev.filter(p => p.proof_id !== proof_id))
            alert(data.message)
        } catch { alert("Server error. Try again.") }
        finally { setProcessing(prev => ({ ...prev, [proof_id]: null })) }
    }

    const handleReject = async (proof_id) => {
        const note = rejectNote[proof_id]?.trim()
        if (!note) { alert("Please enter a reason for rejection first."); return }
        setProcessing(prev => ({ ...prev, [proof_id]: "rejecting" }))
        try {
            const res = await fetch(`http://localhost:5000/api/escrow/admin/proofs/${proof_id}/reject`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin_note: note }),
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed to reject"); return }
            setProofs(prev => prev.filter(p => p.proof_id !== proof_id))
        } catch { alert("Server error. Try again.") }
        finally { setProcessing(prev => ({ ...prev, [proof_id]: null })) }
    }

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <div className="sidebar">
                <div className="nav">
                    <div className="nav-item" onClick={() => navigate("/dashboard")}><LayoutDashboard className="nav-icon" />Dashboard</div>
                    <div className="nav-item" onClick={() => navigate("/events")}><ZodiacSagittarius className="nav-icon" />Explore</div>
                    <div className="nav-item"><Trophy className="nav-icon" />Leaderboard</div>
                    <div className="nav-item" onClick={() => navigate("/donor-history")}><History className="nav-icon" />Donor History</div>
                    <div className="nav-item" onClick={() => navigate("/following")}><Blend className="nav-icon" />Following</div>
                    <div className="nav-item" onClick={() => navigate("/creator-studio")}><KeyboardMusic className="nav-icon" />Creator Studio</div>
                </div>
                <div className="support">
                    <p>Support</p>
                    <div className="nav-item"><Users className="nav-icon" />Community</div>
                    <div className="nav-item ad-active"><Settings className="nav-icon" />Admin Panel</div>
                    <div className="nav-item"><MessageCircleQuestionMark className="nav-icon" />Help & Support</div>
                </div>
            </div>

            <div className="dashboard-card">
                <Topbar title="Admin Dashboard" profileImage={profileImage} />

                <div className="ad-body">
                    {/* HEADER */}
                    <div className="ad-header-row">
                        <div className="ad-header-left">
                            <Shield size={22} className="ad-shield" />
                            <div>
                                <h2 className="ad-title">Milestone Proof Review</h2>
                                <p className="ad-subtitle">{proofs.length} proof{proofs.length !== 1 ? "s" : ""} awaiting review</p>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="ad-loading">Loading pending proofs...</div>
                    ) : error ? (
                        <div className="ad-error">
                            <Shield size={40} strokeWidth={1.2} />
                            <h3>{error}</h3>
                        </div>
                    ) : proofs.length === 0 ? (
                        <div className="ad-empty">
                            <CheckCircle size={48} strokeWidth={1.2} />
                            <h3>All clear!</h3>
                            <p>No milestone proofs are pending review right now.</p>
                        </div>
                    ) : (
                        <div className="ad-proofs-list">
                            {proofs.map(proof => (
                                <div className="ad-proof-card" key={proof.proof_id}>

                                    {/* PROOF HEADER */}
                                    <div className="ad-proof-header">
                                        <div className="ad-proof-org">
                                            <img src={proof.org_avatar || defaultProfile} alt={proof.org_username} className="ad-org-avatar" />
                                            <div>
                                                <span className="ad-org-name">@{proof.org_username}</span>
                                                <span className="ad-event-name">{proof.event_title}</span>
                                            </div>
                                        </div>
                                        <div className="ad-proof-meta">
                                            <span className="ad-milestone-badge">Milestone {proof.release_order}: {proof.milestone_title}</span>
                                            <span className="ad-pct-badge">{proof.percentage_amount}% of funds</span>
                                            <span className="ad-amount-badge">≈ ₹{Math.round((parseFloat(proof.percentage_amount) / 100) * parseFloat(proof.current_amount)).toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="ad-proof-time">
                                            <Clock size={12} />
                                            {new Date(proof.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                        </div>
                                        <button
                                            className="ad-expand-btn"
                                            onClick={() => setExpanded(expanded === proof.proof_id ? null : proof.proof_id)}
                                        >
                                            <Eye size={14} /> {expanded === proof.proof_id ? "Hide" : "Review"}
                                        </button>
                                    </div>

                                    {/* PROOF DETAILS */}
                                    {expanded === proof.proof_id && (
                                        <div className="ad-proof-details">

                                            {/* PROGRESS REPORT */}
                                            <div className="ad-section">
                                                <h4>Progress Report</h4>
                                                <p className="ad-report-text">{proof.progress_report}</p>
                                            </div>

                                            {/* MEDIA */}
                                            {proof.media?.length > 0 && (
                                                <div className="ad-section">
                                                    <h4>Submitted Photos & Documents</h4>
                                                    <div className="ad-media-grid">
                                                        {proof.media.map((m, i) => (
                                                            <a key={i} href={m.url} target="_blank" rel="noreferrer" className="ad-media-item">
                                                                {m.type === "image" ? (
                                                                    <img src={m.url} alt={m.label || "proof"} className="ad-media-img" />
                                                                ) : (
                                                                    <div className="ad-media-doc">
                                                                        <span>📄</span>
                                                                        <span>{m.label || "Document"}</span>
                                                                    </div>
                                                                )}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ESCROW INFO */}
                                            <div className="ad-escrow-info">
                                                <div className="ad-escrow-stat">
                                                    <span className="ad-escrow-label">Total Raised</span>
                                                    <span className="ad-escrow-val">₹{parseFloat(proof.current_amount).toLocaleString("en-IN")}</span>
                                                </div>
                                                <div className="ad-escrow-stat">
                                                    <span className="ad-escrow-label">In Escrow</span>
                                                    <span className="ad-escrow-val">₹{parseFloat(proof.escrow_balance).toLocaleString("en-IN")}</span>
                                                </div>
                                                <div className="ad-escrow-stat highlight">
                                                    <span className="ad-escrow-label">Will Release</span>
                                                    <span className="ad-escrow-val">₹{Math.round((parseFloat(proof.percentage_amount) / 100) * parseFloat(proof.current_amount)).toLocaleString("en-IN")}</span>
                                                </div>
                                            </div>

                                            {/* VIEW EVENT LINK */}
                                            <button
                                                className="ad-view-event-btn"
                                                onClick={() => navigate(`/events/${proof.event_id}`)}
                                            >
                                                <Eye size={13} /> View Full Event
                                            </button>

                                            {/* APPROVE / REJECT */}
                                            <div className="ad-actions">
                                                <div className="ad-reject-section">
                                                    <textarea
                                                        className="ad-reject-note"
                                                        placeholder="Rejection reason (required to reject)..."
                                                        value={rejectNote[proof.proof_id] || ""}
                                                        onChange={e => setRejectNote(prev => ({ ...prev, [proof.proof_id]: e.target.value }))}
                                                        rows={2}
                                                    />
                                                    <button
                                                        className="ad-reject-btn"
                                                        onClick={() => handleReject(proof.proof_id)}
                                                        disabled={!!processing[proof.proof_id]}
                                                    >
                                                        <XCircle size={15} />
                                                        {processing[proof.proof_id] === "rejecting" ? "Rejecting..." : "Reject"}
                                                    </button>
                                                </div>
                                                <button
                                                    className="ad-approve-btn"
                                                    onClick={() => handleApprove(proof.proof_id)}
                                                    disabled={!!processing[proof.proof_id]}
                                                >
                                                    <CheckCircle size={15} />
                                                    {processing[proof.proof_id] === "approving" ? "Approving..." : "Approve & Release Funds"}
                                                </button>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}