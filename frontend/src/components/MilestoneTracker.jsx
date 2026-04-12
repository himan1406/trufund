import { useState, useRef } from "react"
import { CheckCircle, Clock, Lock, AlertCircle, ChevronDown, ChevronUp, ImagePlus, X, Loader } from "lucide-react"
import "../styles/milestonetracker.css"

const STATUS_ICON = {
    locked: <Lock size={16} />,
    available: <Clock size={16} />,
    submitted: <Clock size={16} />,
    approved: <CheckCircle size={16} />,
    rejected: <AlertCircle size={16} />,
}

const STATUS_LABEL = {
    locked: "Locked",
    available: "Ready for Proof",
    submitted: "Under Review",
    approved: "Approved ✓",
    rejected: "Rejected — Resubmit",
}

export default function MilestoneTracker({
    milestones = [],
    isOwner = false,
    eventId,
    onProofSubmitted,
}) {
    const [expanded, setExpanded] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState("")
    const [submitSuccess, setSubmitSuccess] = useState("")

    /* proof form state */
    const [report, setReport] = useState("")
    const [files, setFiles] = useState([])
    const fileRef = useRef(null)

    const handleFilePick = (e) => {
        const picked = Array.from(e.target.files)
        if (!picked.length) return
        const newFiles = picked.map(f => ({
            file: f,
            preview: f.type.startsWith("image") ? URL.createObjectURL(f) : null,
            name: f.name,
        }))
        setFiles(prev => [...prev, ...newFiles].slice(0, 10))
        e.target.value = ""
    }

    const resetForm = () => {
        setReport(""); setFiles([]); setSubmitError(""); setSubmitSuccess("")
    }

    const handleSubmitProof = async (milestone_id) => {
        if (!report.trim()) { setSubmitError("A written progress report is required"); return }
        setSubmitting(true); setSubmitError("")

        try {
            const formData = new FormData()
            formData.append("progress_report", report.trim())
            files.forEach(f => formData.append("proof_files", f.file))

            const res = await fetch(`http://localhost:5000/api/escrow/milestones/${milestone_id}/proof`, {
                method: "POST", credentials: "include", body: formData
            })
            const data = await res.json()

            if (!res.ok) { setSubmitError(data.error || "Failed to submit proof"); return }

            setSubmitSuccess("Proof submitted! Awaiting admin review.")
            resetForm()
            if (onProofSubmitted) onProofSubmitted()
        } catch { setSubmitError("Server error. Try again.") }
        finally { setSubmitting(false) }
    }

    if (!milestones.length) return null

    return (
        <div className="mt-wrap">
            <h3 className="mt-title">Milestone Progress</h3>

            <div className="mt-stepper">
                {milestones.map((m, idx) => (
                    <div key={m.milestone_id} className={`mt-step ${m.status}`}>

                        {/* CONNECTOR LINE */}
                        {idx < milestones.length - 1 && (
                            <div className={`mt-connector ${milestones[idx + 1].status !== "locked" ? "filled" : ""}`} />
                        )}

                        {/* STEP DOT */}
                        <div className={`mt-dot ${m.status}`}>
                            {STATUS_ICON[m.status]}
                        </div>

                        {/* STEP INFO */}
                        <div className="mt-step-body">
                            <div
                                className="mt-step-header"
                                onClick={() => setExpanded(expanded === m.milestone_id ? null : m.milestone_id)}
                            >
                                <div className="mt-step-left">
                                    <span className="mt-step-order">Milestone {m.release_order}</span>
                                    <span className="mt-step-title">{m.title}</span>
                                </div>
                                <div className="mt-step-right">
                                    <span className={`mt-step-pct ${m.status}`}>{m.percentage_amount}%</span>
                                    <span className={`mt-step-status ${m.status}`}>{STATUS_LABEL[m.status]}</span>
                                    {expanded === m.milestone_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </div>
                            </div>

                            {/* EXPANDED DETAILS */}
                            {expanded === m.milestone_id && (
                                <div className="mt-step-details">
                                    {m.description && <p className="mt-step-desc">{m.description}</p>}

                                    {/* APPROVED — show released amount */}
                                    {m.status === "approved" && (
                                        <div className="mt-released">
                                            <CheckCircle size={14} />
                                            ₹{parseFloat(m.amount_released || 0).toLocaleString("en-IN")} released to organiser
                                        </div>
                                    )}

                                    {/* SUBMITTED — show pending review notice */}
                                    {m.status === "submitted" && (
                                        <div className="mt-pending-notice">
                                            <Clock size={14} />
                                            Proof submitted — awaiting admin review
                                        </div>
                                    )}

                                    {/* REJECTED — show admin note */}
                                    {m.status === "rejected" && m.proof_status === "rejected" && m.admin_note && (
                                        <div className="mt-rejection-note">
                                            <AlertCircle size={14} />
                                            Admin feedback: {m.admin_note}
                                        </div>
                                    )}

                                    {/* PROOF FORM — only for owner when milestone is available or rejected */}
                                    {isOwner && (m.status === "available" || m.status === "rejected") && (
                                        <div className="mt-proof-form">
                                            <p className="mt-proof-label">Submit proof to unlock funds for this milestone:</p>

                                            <textarea
                                                className="mt-report-input"
                                                placeholder="Write a progress report describing what was accomplished, how funds will be used, etc."
                                                value={report}
                                                onChange={e => { setReport(e.target.value); setSubmitError("") }}
                                                rows={4}
                                            />

                                            {/* FILE PREVIEWS */}
                                            {files.length > 0 && (
                                                <div className="mt-file-list">
                                                    {files.map((f, i) => (
                                                        <div key={i} className="mt-file-item">
                                                            {f.preview
                                                                ? <img src={f.preview} alt={f.name} className="mt-file-thumb" />
                                                                : <div className="mt-file-doc">📄</div>
                                                            }
                                                            <span className="mt-file-name">{f.name}</span>
                                                            <button
                                                                type="button"
                                                                className="mt-file-remove"
                                                                onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {submitError && <p className="mt-error">{submitError}</p>}
                                            {submitSuccess && <p className="mt-success">{submitSuccess}</p>}

                                            <div className="mt-proof-actions">
                                                <button
                                                    type="button"
                                                    className="mt-upload-btn"
                                                    onClick={() => fileRef.current.click()}
                                                    disabled={files.length >= 10}
                                                >
                                                    <ImagePlus size={15} /> Add Photos / Bills
                                                </button>
                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                                    multiple
                                                    style={{ display: "none" }}
                                                    onChange={handleFilePick}
                                                />
                                                <button
                                                    type="button"
                                                    className="mt-submit-btn"
                                                    onClick={() => handleSubmitProof(m.milestone_id)}
                                                    disabled={submitting}
                                                >
                                                    {submitting ? <><Loader size={14} className="spin" /> Submitting...</> : "Submit Proof"}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}