import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import "../styles/eventdetail.css"

import {
    Heart, ChevronLeft, ChevronRight, Target, Calendar,
    CheckCircle, X, Loader, Share2, RefreshCw
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import Topbar from "../components/Topbar"
import CreatePostModal from "../components/CreatePostModal"
import MilestoneTracker from "../components/MilestoneTracker"
import defaultProfile from "../assets/images/default_profile.jpg"

/* load Razorpay script dynamically */
function loadRazorpay() {
    return new Promise(resolve => {
        if (window.Razorpay) { resolve(true); return }
        const script = document.createElement("script")
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

import API_BASE_URL from "../utils/api"

export default function EventDetail() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [profileImage, setProfileImage] = useState(null)
    const [myUserId, setMyUserId] = useState(null)
    const [myUsername, setMyUsername] = useState("")
    const [mediaIndex, setMediaIndex] = useState(0)

    /* donation form */
    const [amount, setAmount] = useState("")
    const [isAnonymous, setIsAnonymous] = useState(localStorage.getItem("alwaysAnonymous") === "true")
    const [donationMsg, setDonationMsg] = useState("")
    const [donating, setDonating] = useState(false)
    const [donateError, setDonateError] = useState("")

    /* milestones */
    const [milestones, setMilestones] = useState([])

    /* share + refresh */
    const [shareMsg, setShareMsg]     = useState("")
    const [refreshing, setRefreshing] = useState(false)

    /* success banner */
    const [showSuccess, setShowSuccess] = useState(false)
    const [successMsg, setSuccessMsg] = useState("")

    const allMedia = event ? [
        ...(event.cover_image ? [{ media_url: event.cover_image, media_type: "image" }] : []),
        ...(event.media || []),
    ] : []
    const dedupedMedia = allMedia.filter((m, i) =>
        allMedia.findIndex(x => x.media_url === m.media_url) === i
    )

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, eventRes, milestonesRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/users/profile`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/api/events/${id}`, { credentials: "include" }),
                    fetch(`${API_BASE_URL}/api/escrow/events/${id}/milestones`, { credentials: "include" }),
                ])
                if (!profileRes.ok) { if (profileRes.status === 401) { navigate("/login"); return } }
                const profileData = await profileRes.json()
                setProfileImage(profileData?.user?.profile_image || null)
                setMyUserId(profileData?.user?.user_id || null)
                setMyUsername(profileData?.user?.username || "")

                if (eventRes.status === 404) { setError("Event not found."); setLoading(false); return }
                if (!eventRes.ok) throw new Error()
                const eventData = await eventRes.json()
                setEvent(eventData.event)

                if (milestonesRes.ok) {
                    const milestonesData = await milestonesRes.json()
                    setMilestones(milestonesData.milestones || [])
                }
            } catch { setError("Could not load event.") }
            finally { setLoading(false) }
        }
        fetchAll()
    }, [id, navigate])

    /* refresh donations from server */
    const refreshDonations = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/payments/donations/${id}`, {
                credentials: "include"
            })
            if (res.ok) {
                const data = await res.json()
                setEvent(prev => ({ ...prev, donations: data.donations }))
            }
        } catch (err) { console.error(err) }
    }

    const handleShare = () => {
        const url = window.location.href
        if (navigator.share) {
            navigator.share({ title: event?.title || "TruFund Event", url }).catch(() => {})
        } else {
            navigator.clipboard.writeText(url).then(() => {
                setShareMsg("Link copied!")
                setTimeout(() => setShareMsg(""), 2500)
            })
        }
    }

    const handleManualRefresh = async () => {
        setRefreshing(true)
        try {
            const [eventRes, donRes] = await Promise.all([
                fetch(`http://localhost:5000/api/events/${id}`, { credentials: "include" }),
                fetch(`http://localhost:5000/api/payments/donations/${id}`, { credentials: "include" }),
            ])
            if (eventRes.ok) { const d = await eventRes.json(); setEvent(d.event) }
            if (donRes.ok)   { const d = await donRes.json(); setEvent(prev => ({ ...prev, donations: d.donations })) }
        } catch (err) { console.error(err) }
        finally { setRefreshing(false) }
    }

    const handleDonate = async (e) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) < 1) { setDonateError("Minimum donation is ₹1"); return }
        setDonating(true); setDonateError("")

        try {
            /* step 1 — create Razorpay order on backend */
            const orderRes = await fetch("http://localhost:5000/api/payments/create-order", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_id: parseInt(id),
                    amount: parseFloat(amount),
                    is_anonymous: isAnonymous,
                    message: donationMsg.trim(),
                }),
            })
            const orderData = await orderRes.json()
            if (!orderRes.ok) { setDonateError(orderData.error || "Failed to start payment"); setDonating(false); return }

            /* step 2 — load Razorpay script */
            const loaded = await loadRazorpay()
            if (!loaded) { setDonateError("Could not load payment gateway. Check your internet connection."); setDonating(false); return }

            /* step 3 — open Razorpay checkout popup */
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: "INR",
                name: "TruFund",
                description: `Donation to: ${orderData.event_title}`,
                order_id: orderData.order_id,
                prefill: {
                    name: myUsername,
                },
                theme: { color: "#1c4e14" },

                handler: async (response) => {
                    /* step 4 — verify payment on backend */
                    try {
                        const verifyRes = await fetch("http://localhost:5000/api/payments/verify", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                event_id: parseInt(id),
                                amount: parseFloat(amount),
                                is_anonymous: isAnonymous,
                                message: donationMsg.trim(),
                            }),
                        })
                        const verifyData = await verifyRes.json()

                        if (!verifyRes.ok) {
                            setDonateError(verifyData.error || "Payment verification failed")
                            return
                        }

                        /* step 5 — update progress bar and donation feed live */
                        setEvent(prev => ({
                            ...prev,
                            current_amount: verifyData.current_amount,
                            goal_amount: verifyData.goal_amount,
                            progress: verifyData.progress,
                            status: verifyData.status,
                        }))

                        /* add new donation to top of feed optimistically */
                        const newDonation = {
                            donation_id: Date.now(),
                            amount: parseFloat(amount),
                            is_anonymous: isAnonymous,
                            message: donationMsg.trim() || null,
                            username: isAnonymous ? null : myUsername,
                            donated_at: new Date().toISOString(),
                        }
                        setEvent(prev => ({
                            ...prev,
                            donations: [newDonation, ...(prev.donations || [])],
                        }))

                        /* show success banner */
                        setSuccessMsg(`Thank you! Your donation of ₹${parseFloat(amount).toLocaleString("en-IN")} was received.`)
                        setShowSuccess(true)
                        setTimeout(() => setShowSuccess(false), 6000)

                        /* reset form */
                        setAmount(""); setDonationMsg(""); setIsAnonymous(false)

                        /* refresh donations from server after short delay */
                        setTimeout(refreshDonations, 2000)

                    } catch { setDonateError("Verification error. Contact support if money was deducted.") }
                    finally { setDonating(false) }
                },

                modal: {
                    ondismiss: () => { setDonating(false) }
                },
            }

            const rzp = new window.Razorpay(options)
            rzp.on("payment.failed", (response) => {
                setDonateError(`Payment failed: ${response.error.description}`)
                setDonating(false)
            })
            rzp.open()

        } catch (err) {
            setDonateError("Server error. Try again.")
            setDonating(false)
        }
    }

    const QUICK_AMOUNTS = [50, 100, 500, 1000, 5000]

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <Sidebar />

            <div className="dashboard-card">
                <Topbar title="Event" profileImage={profileImage} />

                {/* SUCCESS BANNER */}
                {showSuccess && (
                    <div className="ed-success-banner">
                        <CheckCircle size={18} />
                        <span>{successMsg}</span>
                        <button onClick={() => setShowSuccess(false)}><X size={14} /></button>
                    </div>
                )}

                <div className="ed-body">
                    {loading ? (
                        <div className="ed-loading">Loading event...</div>
                    ) : error ? (
                        <div className="ed-error">
                            <h3>{error}</h3>
                            <button onClick={() => navigate("/events")}>Browse Events</button>
                        </div>
                    ) : event && (
                        <>
                            {/* LEFT */}
                            <div className="ed-main">

                                {/* MEDIA CAROUSEL */}
                                {dedupedMedia.length > 0 && (
                                    <div className="ed-media-wrap">
                                        {dedupedMedia[mediaIndex].media_type === "video" ? (
                                            <video src={dedupedMedia[mediaIndex].media_url} className="ed-media" controls />
                                        ) : (
                                            <img src={dedupedMedia[mediaIndex].media_url} alt={event.title} className="ed-media" />
                                        )}
                                        {dedupedMedia.length > 1 && (
                                            <>
                                                <button className="ed-nav ed-nav-left"
                                                    onClick={() => setMediaIndex(i => Math.max(0, i - 1))}
                                                    disabled={mediaIndex === 0}>
                                                    <ChevronLeft size={18} />
                                                </button>
                                                <button className="ed-nav ed-nav-right"
                                                    onClick={() => setMediaIndex(i => Math.min(dedupedMedia.length - 1, i + 1))}
                                                    disabled={mediaIndex === dedupedMedia.length - 1}>
                                                    <ChevronRight size={18} />
                                                </button>
                                                <div className="ed-dots">
                                                    {dedupedMedia.map((_, i) => (
                                                        <div key={i} className={`ed-dot ${i === mediaIndex ? "active" : ""}`} />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* TITLE + META */}
                                <div className="ed-info">
                                    <div className="ed-badges">
                                        <span className="ed-category">{event.category}</span>
                                        <span className={`ed-status ${event.status}`}>{event.status}</span>
                                    </div>
                                    <h1 className="ed-title">{event.title}</h1>

                                    <div className="ed-creator" onClick={() => navigate(`/profile/${event.creator.username}`)}>
                                        <img src={event.creator.profile_image || defaultProfile} alt={event.creator.username} className="ed-creator-avatar" />
                                        <span>by <strong>@{event.creator.username}</strong></span>
                                    </div>

                                    <div className="ed-dates">
                                        {event.start_date && (
                                            <span><Calendar size={13} />{new Date(event.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                                        )}
                                        {event.end_date && (
                                            <span>→ {new Date(event.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                                        )}
                                    </div>

                                    {event.description && (
                                        <p className="ed-description">{event.description}</p>
                                    )}
                                </div>

                                {/* DONATION STREAM */}
                                <div className="ed-donations-section">
                                    <div className="ed-donations-header">
                                        <h3 className="ed-donations-title">
                                            Donation Activity
                                            {event.donations?.length > 0 && (
                                                <span className="ed-donations-count"> · {event.donations.length}</span>
                                            )}
                                        </h3>
                                        <div className="ed-donations-actions">
                                            <button className="ed-refresh-btn" onClick={handleManualRefresh} disabled={refreshing} title="Refresh">
                                                <RefreshCw size={14} className={refreshing ? "spin" : ""} />
                                            </button>
                                            <button className="ed-share-btn" onClick={handleShare}>
                                                <Share2 size={14} />
                                                <span>{shareMsg || "Share"}</span>
                                            </button>
                                        </div>
                                    </div>
                                    {!event.donations || event.donations.length === 0 ? (
                                        <div className="ed-donations-empty">
                                            <Heart size={28} strokeWidth={1.2} />
                                            <p>Be the first to donate!</p>
                                        </div>
                                    ) : (
                                        <div className="ed-donations-list">
                                            {event.donations.map((d, i) => (
                                                <div className="ed-donation-item" key={d.donation_id || i}>
                                                    <div className="ed-donation-avatar">
                                                        {d.username ? d.username.charAt(0).toUpperCase() : "?"}
                                                    </div>
                                                    <div className="ed-donation-info">
                                                        <span className="ed-donation-name">
                                                            {d.username ? `@${d.username}` : "Anonymous"}
                                                            <span className="ed-donation-verb"> donated</span>
                                                        </span>
                                                        {d.message && (
                                                            <span className="ed-donation-message">"{d.message}"</span>
                                                        )}
                                                        <span className="ed-donation-time">
                                                            {new Date(d.donated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    </div>
                                                    <div className="ed-donation-amount">
                                                        ₹{parseFloat(d.amount).toLocaleString("en-IN")}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* MILESTONE TRACKER */}
                                {milestones.length > 0 && (
                                    <MilestoneTracker
                                        milestones={milestones}
                                        isOwner={event.creator.user_id === myUserId}
                                        eventId={id}
                                        onProofSubmitted={() => {
                                            fetch(`http://localhost:5000/api/escrow/events/${id}/milestones`, { credentials: "include" })
                                                .then(r => r.json())
                                                .then(d => setMilestones(d.milestones || []))
                                                .catch(console.error)
                                        }}
                                    />
                                )}

                            </div>

                            {/* RIGHT — progress + donate */}
                            <div className="ed-right">

                                {/* PROGRESS CARD */}
                                <div className="ed-progress-card">
                                    <div className="ed-progress-amounts">
                                        <span className="ed-raised">₹{parseFloat(event.current_amount).toLocaleString("en-IN")}</span>
                                        <span className="ed-goal-label">raised of ₹{parseFloat(event.goal_amount).toLocaleString("en-IN")} goal</span>
                                    </div>
                                    <div className="ed-progress-bar">
                                        <div className="ed-progress-fill" style={{ width: `${event.progress}%` }} />
                                    </div>
                                    <div className="ed-progress-pct">{event.progress}% funded</div>
                                    <div className="ed-donors-count">
                                        <Heart size={13} /> {event.donations?.length || 0} donation{(event.donations?.length || 0) !== 1 ? "s" : ""}
                                    </div>
                                </div>

                                {/* DONATE FORM */}
                                {event.status === "active" && (
                                    <div className="ed-donate-card">
                                        <h3>Make a Donation</h3>

                                        <div className="ed-quick-amounts">
                                            {QUICK_AMOUNTS.map(a => (
                                                <button
                                                    key={a}
                                                    type="button"
                                                    className={`ed-quick-btn ${parseFloat(amount) === a ? "selected" : ""}`}
                                                    onClick={() => setAmount(String(a))}
                                                >
                                                    ₹{a}
                                                </button>
                                            ))}
                                        </div>

                                        <form onSubmit={handleDonate}>
                                            <div className="ed-amount-input-wrap">
                                                <span className="ed-rupee">₹</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="ed-amount-input"
                                                    placeholder="Enter amount"
                                                    value={amount}
                                                    onChange={e => { setAmount(e.target.value); setDonateError("") }}
                                                />
                                            </div>

                                            <textarea
                                                className="ed-msg-input"
                                                placeholder="Leave a message (optional)"
                                                value={donationMsg}
                                                onChange={e => setDonationMsg(e.target.value)}
                                                rows={2}
                                            />

                                            <label className="ed-anon-label">
                                                <input
                                                    type="checkbox"
                                                    checked={isAnonymous}
                                                    onChange={e => setIsAnonymous(e.target.checked)}
                                                />
                                                <span>Donate anonymously</span>
                                            </label>

                                            {donateError && <p className="ed-donate-error">{donateError}</p>}

                                            <button type="submit" className="ed-donate-btn" disabled={donating}>
                                                {donating
                                                    ? <><Loader size={15} className="spin" /> Opening payment...</>
                                                    : <><Heart size={15} /> Donate Now</>
                                                }
                                            </button>
                                        </form>

                                        <p className="ed-razorpay-note">🔒 Secure payment via Razorpay · UPI, Cards, NetBanking & Wallets accepted</p>
                                    </div>
                                )}

                                {event.status === "completed" && (
                                    <div className="ed-completed-card">
                                        <CheckCircle size={32} />
                                        <h3>Goal Reached!</h3>
                                        <p>This event has reached its donation goal. Thank you to all donors!</p>
                                    </div>
                                )}

                                {event.status === "ended" && (
                                    <div className="ed-completed-card ed-ended-card">
                                        <Calendar size={32} />
                                        <h3>Fundraiser Ended</h3>
                                        <p>The deadline for this fundraiser has passed. It is no longer accepting donations.</p>
                                    </div>
                                )}

                            </div>
                        </>
                    )}
                </div>

                <CreatePostModal profileImage={profileImage} />
            </div>
        </div>
    )
}