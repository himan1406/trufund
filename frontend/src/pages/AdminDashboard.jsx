import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import "../styles/admindashboard.css"

import {
    CheckCircle, XCircle, Eye, Clock, Shield, BadgeCheck, FileText, Landmark, CreditCard,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/TopBar"
import defaultProfile from "../assets/images/default_profile.jpg"

import API_BASE_URL from "../utils/api"

const API = API_BASE_URL

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [tab, setTab]               = useState(searchParams.get("tab") || "proofs")   // proofs | verifications
    const [proofs, setProofs]         = useState([])
    const [verifs, setVerifs]         = useState([])
    const [loading, setLoading]       = useState(true)
    const [profileImage, setProfileImage] = useState(null)
    const [error, setError]           = useState("")
    const [expanded, setExpanded]     = useState(null)
    const [rejectNote, setRejectNote] = useState({})
    const [processing, setProcessing] = useState({})

    useEffect(() => {
        const t = searchParams.get("tab")
        if (t) setTab(t)
    }, [searchParams])

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, proofsRes, verifRes] = await Promise.all([
                    fetch(`${API}/api/users/profile`,                   { credentials: "include" }),
                    fetch(`${API}/api/escrow/admin/proofs/pending`,     { credentials: "include" }),
                    fetch(`${API}/api/users/admin/verifications`,       { credentials: "include" }),
                ])
                if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }
                const profileData = await profileRes.json()
                setProfileImage(profileData?.user?.profile_image || null)

                if (proofsRes.status === 403 || verifRes.status === 403) {
                    setError("You need admin access to view this page.")
                    setLoading(false); return
                }
                if (proofsRes.ok) setProofs((await proofsRes.json()).proofs || [])
                if (verifRes.ok)  setVerifs((await verifRes.json()).verifications || [])
            } catch { setError("Could not load admin data.") }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [navigate])

    const handleApproveProof = async (proof_id) => {
        setProcessing(prev => ({ ...prev, [proof_id]: "transferring" }))
        
        // Simulating the bank transfer delay for demo purposes
        await new Promise(r => setTimeout(r, 2000))
        
        setProcessing(prev => ({ ...prev, [proof_id]: "approving" }))
        try {
            const res  = await fetch(`${API}/api/escrow/admin/proofs/${proof_id}/approve`, {
                method: "POST", credentials: "include"
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed"); return }
            setProofs(prev => prev.filter(p => p.proof_id !== proof_id))
        } catch { alert("Server error.") }
        finally { setProcessing(prev => ({ ...prev, [proof_id]: null })) }
    }

    const handleRejectProof = async (proof_id) => {
        const note = rejectNote[proof_id]?.trim()
        if (!note) { alert("Enter a rejection reason first."); return }
        setProcessing(prev => ({ ...prev, [proof_id]: "rejecting" }))
        try {
            const res  = await fetch(`${API}/api/escrow/admin/proofs/${proof_id}/reject`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin_note: note }),
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed"); return }
            setProofs(prev => prev.filter(p => p.proof_id !== proof_id))
        } catch { alert("Server error.") }
        finally { setProcessing(prev => ({ ...prev, [proof_id]: null })) }
    }

    /* ── VERIFICATION ACTIONS ── */
    const handleApproveVerif = async (verification_id) => {
        setProcessing(prev => ({ ...prev, [`v_${verification_id}`]: "approving" }))
        try {
            const res  = await fetch(`${API}/api/users/admin/verifications/${verification_id}/approve`, {
                method: "POST", credentials: "include"
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed"); return }
            setVerifs(prev => prev.filter(v => v.verification_id !== verification_id))
            alert(data.message)
        } catch { alert("Server error.") }
        finally { setProcessing(prev => ({ ...prev, [`v_${verification_id}`]: null })) }
    }

    const handleRejectVerif = async (verification_id) => {
        const note = rejectNote[`v_${verification_id}`]?.trim()
        if (!note) { alert("Enter a rejection reason first."); return }
        setProcessing(prev => ({ ...prev, [`v_${verification_id}`]: "rejecting" }))
        try {
            const res  = await fetch(`${API}/api/users/admin/verifications/${verification_id}/reject`, {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ admin_note: note }),
            })
            const data = await res.json()
            if (!res.ok) { alert(data.error || "Failed"); return }
            setVerifs(prev => prev.filter(v => v.verification_id !== verification_id))
        } catch { alert("Server error.") }
        finally { setProcessing(prev => ({ ...prev, [`v_${verification_id}`]: null })) }
    }

    const totalPending = proofs.length + verifs.length

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <Sidebar />

            <div className="dashboard-card">
                <Topbar title="Admin Panel" profileImage={profileImage} />

                <div className="ad-body">

                    {/* HEADER */}
                    <div className="ad-header-row">
                        <div className="ad-header-left">
                            <Shield size={22} className="ad-shield" />
                            <div>
                                <h2 className="ad-title">Admin Panel</h2>
                                <p className="ad-subtitle">{totalPending} item{totalPending !== 1 ? "s" : ""} awaiting review</p>
                            </div>
                        </div>

                        {/* TABS */}
                        <div className="ad-tabs">
                            <button
                                className={`ad-tab ${tab === "proofs" ? "active" : ""}`}
                                onClick={() => setTab("proofs")}
                            >
                                <FileText size={14} />
                                Milestone Proofs
                                {proofs.length > 0 && <span className="ad-tab-badge">{proofs.length}</span>}
                            </button>
                            <button
                                className={`ad-tab ${tab === "verifications" ? "active" : ""}`}
                                onClick={() => setTab("verifications")}
                            >
                                <BadgeCheck size={14} />
                                Org Verifications
                                {verifs.length > 0 && <span className="ad-tab-badge">{verifs.length}</span>}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="ad-loading">Loading...</div>
                    ) : error ? (
                        <div className="ad-error">
                            <Shield size={40} strokeWidth={1.2} />
                            <h3>{error}</h3>
                        </div>
                    ) : tab === "proofs" ? (

                        /* ══════════════ MILESTONE PROOFS TAB ══════════════ */
                        proofs.length === 0 ? (
                            <div className="ad-empty">
                                <CheckCircle size={48} strokeWidth={1.2} />
                                <h3>All clear!</h3>
                                <p>No milestone proofs pending review.</p>
                            </div>
                        ) : (
                            <div className="ad-proofs-list">
                                {proofs.map(proof => (
                                    <div className="ad-proof-card" key={proof.proof_id}>
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
                                                <span className="ad-pct-badge">{proof.percentage_amount}%</span>
                                                <span className="ad-amount-badge">≈ ₹{Math.round((parseFloat(proof.percentage_amount) / 100) * parseFloat(proof.current_amount)).toLocaleString("en-IN")}</span>
                                            </div>
                                            <div className="ad-proof-time">
                                                <Clock size={12} />
                                                {new Date(proof.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                            </div>
                                            <button className="ad-expand-btn" onClick={() => setExpanded(expanded === proof.proof_id ? null : proof.proof_id)}>
                                                <Eye size={14} /> {expanded === proof.proof_id ? "Hide" : "Review"}
                                            </button>
                                        </div>

                                        {expanded === proof.proof_id && (
                                            <div className="ad-proof-details">
                                                <div className="ad-section">
                                                    <h4>Progress Report</h4>
                                                    <p className="ad-report-text">{proof.progress_report}</p>
                                                </div>
                                                {proof.media?.length > 0 && (
                                                    <div className="ad-section">
                                                        <h4>Submitted Files</h4>
                                                        <div className="ad-media-grid">
                                                            {proof.media.map((m, i) => (
                                                                <a key={i} href={m.url} target="_blank" rel="noreferrer" className="ad-media-item">
                                                                    {m.type === "image"
                                                                        ? <img src={m.url} alt={m.label} className="ad-media-img" />
                                                                        : <div className="ad-media-doc"><span>📄</span><span>{m.label || "Doc"}</span></div>
                                                                    }
                                                                </a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="ad-escrow-info">
                                                    <div className="ad-escrow-stat"><span className="ad-escrow-label">Total Raised</span><span className="ad-escrow-val">₹{parseFloat(proof.current_amount).toLocaleString("en-IN")}</span></div>
                                                    <div className="ad-escrow-stat"><span className="ad-escrow-label">In Escrow</span><span className="ad-escrow-val">₹{parseFloat(proof.escrow_balance).toLocaleString("en-IN")}</span></div>
                                                    <div className="ad-escrow-stat highlight"><span className="ad-escrow-label">Will Release</span><span className="ad-escrow-val">₹{Math.round((parseFloat(proof.percentage_amount) / 100) * parseFloat(proof.current_amount)).toLocaleString("en-IN")}</span></div>
                                                </div>
                                                
                                                {/* BANK / PAYOUT DETAILS (Scratchpad add) */}
                                                <div className="ad-section ad-payout-dest">
                                                    <h4><Landmark size={14} /> Payout Destination</h4>
                                                    {proof.bank_account_name && proof.bank_account_num ? (
                                                        <div className="ad-bank-card">
                                                            <div className="ad-bank-row">
                                                                <span className="ad-bank-label">Holder Name</span>
                                                                <span className="ad-bank-val">{proof.bank_account_name}</span>
                                                            </div>
                                                            <div className="ad-bank-row">
                                                                <span className="ad-bank-label">Account No.</span>
                                                                <span className="ad-bank-val">{proof.bank_account_num}</span>
                                                            </div>
                                                            <div className="ad-bank-row">
                                                                <span className="ad-bank-label">IFSC Code</span>
                                                                <span className="ad-bank-val">{proof.bank_ifsc || "N/A"}</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="ad-bank-missing">
                                                            <CreditCard size={14} />
                                                            <span>Organization has not linked a bank account yet.</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <button className="ad-view-event-btn" onClick={() => navigate(`/events/${proof.event_id}`)}>
                                                    <Eye size={13} /> View Full Event
                                                </button>
                                                <div className="ad-actions">
                                                    <div className="ad-reject-section">
                                                        <textarea className="ad-reject-note" placeholder="Rejection reason (required)..." value={rejectNote[proof.proof_id] || ""} onChange={e => setRejectNote(prev => ({ ...prev, [proof.proof_id]: e.target.value }))} rows={2} />
                                                        <button className="ad-reject-btn" onClick={() => handleRejectProof(proof.proof_id)} disabled={!!processing[proof.proof_id]}>
                                                            <XCircle size={15} /> {processing[proof.proof_id] === "rejecting" ? "Rejecting..." : "Reject"}
                                                        </button>
                                                    </div>
                                                <button className="ad-approve-btn" 
                                                    onClick={() => {
                                                        console.log("APPROVING PROOF:", proof);
                                                        handleApproveProof(proof.proof_id);
                                                    }} 
                                                    disabled={!!processing[proof.proof_id]}
                                                >
                                                    <CheckCircle size={15} /> 
                                                    {processing[proof.proof_id] === "transferring" ? "Simulating Bank Transfer..." 
                                                     : processing[proof.proof_id] === "approving" ? "Approving..." 
                                                     : "Approve & Release Funds"}
                                                </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )

                    ) : (

                        /* ══════════════ ORG VERIFICATIONS TAB ══════════════ */
                        verifs.length === 0 ? (
                            <div className="ad-empty">
                                <BadgeCheck size={48} strokeWidth={1.2} />
                                <h3>No pending verifications</h3>
                                <p>All organisation verification requests have been reviewed.</p>
                            </div>
                        ) : (
                            <div className="ad-proofs-list">
                                {verifs.map(v => {
                                    const key = `v_${v.verification_id}`
                                    return (
                                        <div className="ad-proof-card" key={v.verification_id}>
                                            <div className="ad-proof-header">
                                                <div className="ad-proof-org">
                                                    <img src={v.profile_image || defaultProfile} alt={v.username} className="ad-org-avatar" />
                                                    <div>
                                                        <span className="ad-org-name">@{v.username}</span>
                                                        <span className="ad-event-name">{v.org_name}</span>
                                                    </div>
                                                </div>
                                                <div className="ad-proof-meta">
                                                    <span className="ad-milestone-badge">Org Verification</span>
                                                    {v.website_url && <span className="ad-pct-badge">🌐 {v.website_url.replace(/^https?:\/\//, "")}</span>}
                                                </div>
                                                <div className="ad-proof-time">
                                                    <Clock size={12} />
                                                    {new Date(v.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </div>
                                                <button className="ad-expand-btn" onClick={() => setExpanded(expanded === key ? null : key)}>
                                                    <Eye size={14} /> {expanded === key ? "Hide" : "Review"}
                                                </button>
                                            </div>

                                            {expanded === key && (
                                                <div className="ad-proof-details">
                                                    {v.org_description && (
                                                        <div className="ad-section">
                                                            <h4>About the Organisation</h4>
                                                            <p className="ad-report-text">{v.org_description}</p>
                                                        </div>
                                                    )}
                                                    {v.documents?.length > 0 && (
                                                        <div className="ad-section">
                                                            <h4>Submitted Documents</h4>
                                                            <div className="ad-media-grid">
                                                                {v.documents.map((d, i) => (
                                                                    <a key={i} href={d.url} target="_blank" rel="noreferrer" className="ad-media-item">
                                                                        {d.type === "image"
                                                                            ? <img src={d.url} alt={d.label} className="ad-media-img" />
                                                                            : <div className="ad-media-doc"><span>📄</span><span>{d.label || "Document"}</span></div>
                                                                        }
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button className="ad-view-event-btn" onClick={() => navigate(`/profile/${v.username}`)}>
                                                        <Eye size={13} /> View Profile
                                                    </button>
                                                    <div className="ad-actions">
                                                        <div className="ad-reject-section">
                                                            <textarea className="ad-reject-note" placeholder="Rejection reason (required)..." value={rejectNote[key] || ""} onChange={e => setRejectNote(prev => ({ ...prev, [key]: e.target.value }))} rows={2} />
                                                            <button className="ad-reject-btn" onClick={() => handleRejectVerif(v.verification_id)} disabled={!!processing[key]}>
                                                                <XCircle size={15} /> {processing[key] === "rejecting" ? "Rejecting..." : "Reject"}
                                                            </button>
                                                        </div>
                                                        <button className="ad-approve-btn" onClick={() => handleApproveVerif(v.verification_id)} disabled={!!processing[key]}>
                                                            <BadgeCheck size={15} /> {processing[key] === "approving" ? "Approving..." : "Approve & Verify Org"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    )
}
