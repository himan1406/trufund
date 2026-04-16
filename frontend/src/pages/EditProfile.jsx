import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/editprofile.css"

import {
  Camera,
  User,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Landmark,
} from "lucide-react"

import Sidebar from "../components/Sidebar"

import defaultProfile from "../assets/images/default_profile.jpg"
import Topbar from "../components/Topbar"

export default function EditProfile() {

  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [menuOpen, setMenuOpen] = useState(false)

  /* profile state */
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  /* avatar preview */
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  /* profile form */
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [showDonationHistory, setShowDonationHistory] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null) // { type: "success"|"error", text }

  /* password form */
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState(null)

  /* payout/bank form */
  const [bankName, setBankName] = useState("")
  const [bankNum, setBankNum] = useState("")
  const [bankIfsc, setBankIfsc] = useState("")
  const [bankSaving, setBankSaving] = useState(false)
  const [bankMsg, setBankMsg] = useState(null)

  const storedUsername = localStorage.getItem("username") || "Username"

  /* ── FETCH CURRENT USER ── */
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/users/profile", {
          credentials: "include"
        })
        if (!res.ok) { if (res.status === 401) { navigate("/login"); return } }
        const data = await res.json()
        setCurrentUser(data.user)
        setUsername(data.user.username || "")
        setBio(data.user.bio || "")
        setShowDonationHistory(data.user.show_donation_history ?? true)
        setBankName(data.user.bank_account_name || "")
        setBankNum(data.user.bank_account_num || "")
        setBankIfsc(data.user.bank_ifsc || "")
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [navigate])

  /* ── AVATAR FILE PICK ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  /* ── UPLOAD AVATAR ── */
  const handleAvatarUpload = async () => {
    if (!avatarFile) return
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("profile_image", avatarFile)

      const res = await fetch("http://localhost:5000/api/users/profile/picture", {
        method: "POST",
        credentials: "include",
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        setProfileMsg({ type: "error", text: data.error || "Failed to upload picture" })
        return
      }

      setCurrentUser(prev => ({ ...prev, profile_image: data.profile_image }))
      setAvatarFile(null)
      setProfileMsg({ type: "success", text: "Profile picture updated!" })

    } catch (err) {
      setProfileMsg({ type: "error", text: "Upload failed. Try again." })
    } finally {
      setAvatarUploading(false)
    }
  }

  /* ── SAVE PROFILE ── */
  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!username.trim()) {
      setProfileMsg({ type: "error", text: "Username cannot be empty" })
      return
    }
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          bio: bio.trim(),
          show_donation_history: showDonationHistory,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setProfileMsg({ type: "error", text: data.error || "Failed to update" })
        return
      }

      /* update localStorage so topbar reflects immediately */
      localStorage.setItem("username", data.user.username)
      setCurrentUser(prev => ({ ...prev, ...data.user }))
      setProfileMsg({ type: "success", text: "Profile updated successfully!" })

    } catch (err) {
      setProfileMsg({ type: "error", text: "Server error. Try again." })
    } finally {
      setProfileSaving(false)
    }
  }

  /* ── SAVE PASSWORD ── */
  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "Please fill all password fields" })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match" })
      return
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters" })
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordMsg({ type: "error", text: data.error || "Failed to update password" })
        return
      }

      setPasswordMsg({ type: "success", text: "Password changed successfully!" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

    } catch (err) {
      setPasswordMsg({ type: "error", text: "Server error. Try again." })
    } finally {
      setPasswordSaving(false)
    }
  }

  /* ── SAVE BANK DETAILS ── */
  const handleBankSave = async (e) => {
    e.preventDefault()
    setBankMsg(null)

    if (!bankName.trim() || !bankNum.trim() || !bankIfsc.trim()) {
      setBankMsg({ type: "error", text: "Please fill all bank details to link your account." })
      return
    }

    setBankSaving(true)
    try {
      const res = await fetch("http://localhost:5000/api/users/profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_name: bankName.trim(),
          bank_account_num: bankNum.trim(),
          bank_ifsc: bankIfsc.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setBankMsg({ type: "error", text: data.error || "Failed to update bank details" })
        return
      }

      setBankMsg({ type: "success", text: "Bank details saved securely!" })
    } catch (err) {
      setBankMsg({ type: "error", text: "Server error. Try again." })
    } finally {
      setBankSaving(false)
    }
  }

  const displayAvatar = avatarPreview || currentUser?.profile_image || defaultProfile

  return (
    <div className="dashboard-wrapper">
      <div className="background"></div>
      <div className="brand">TruFund</div>

      <Sidebar />

      {/* MAIN CARD */}
      <div className="dashboard-card">

        {/* TOPBAR */}
        <Topbar title="Edit Profile" profileImage={displayAvatar} />

        {/* BODY */}
        {loading ? (
          <div className="ep-loading">Loading...</div>
        ) : (

          <div className="ep-body">

            {/* LEFT — avatar + profile form */}
            <div className="ep-left">

              {/* AVATAR SECTION */}
              <div className="ep-card ep-avatar-card">

                <div className="ep-avatar-wrap">
                  <img src={displayAvatar} alt="avatar" className="ep-avatar-img" />
                  <button
                    className="ep-avatar-overlay"
                    onClick={() => fileInputRef.current.click()}
                  >
                    <Camera size={20} />
                    <span>Change Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="ep-avatar-info">
                  <h3 className="ep-avatar-name">@{currentUser?.username}</h3>
                  <p className="ep-avatar-hint">JPG, JPEG or PNG · Max 5MB</p>
                </div>

                {avatarFile && (
                  <div className="ep-avatar-actions">
                    <button
                      className="ep-btn-primary"
                      onClick={handleAvatarUpload}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? "Uploading..." : "Save Photo"}
                    </button>
                    <button
                      className="ep-btn-ghost"
                      onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

              </div>

              {/* PROFILE FORM */}
              <div className="ep-card">

                <div className="ep-card-header">
                  <User size={18} />
                  <h3>Profile Info</h3>
                </div>

                <form className="ep-form" onSubmit={handleProfileSave}>

                  <div className="ep-field">
                    <label>Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setProfileMsg(null) }}
                      placeholder="Your username"
                    />
                  </div>

                  <div className="ep-field">
                    <label>Bio</label>
                    <textarea
                      value={bio}
                      onChange={e => { setBio(e.target.value); setProfileMsg(null) }}
                      placeholder="Tell people about yourself..."
                      rows={3}
                    />
                  </div>

                  {/* PRIVACY TOGGLE */}
                  <div className="ep-privacy-row">
                    <div className="ep-privacy-info">
                      <Shield size={16} className="ep-privacy-icon" />
                      <div>
                        <span className="ep-privacy-label">Donation History</span>
                        <span className="ep-privacy-sub">Allow others to see your donations</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`ep-toggle ${showDonationHistory ? "on" : "off"}`}
                      onClick={() => { setShowDonationHistory(prev => !prev); setProfileMsg(null) }}
                    >
                      <div className="ep-toggle-knob" />
                    </button>
                  </div>

                  {profileMsg && (
                    <div className={`ep-msg ${profileMsg.type}`}>
                      {profileMsg.type === "success"
                        ? <CheckCircle size={15} />
                        : <XCircle size={15} />
                      }
                      {profileMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="ep-btn-primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving..." : "Save Changes"}
                  </button>

                </form>

              </div>

            </div>

            {/* RIGHT — password form */}
            <div className="ep-right">

              <div className="ep-card ep-password-card">

                <div className="ep-card-header">
                  <Lock size={18} />
                  <h3>Change Password</h3>
                </div>

                <p className="ep-password-hint">
                  Enter your current password to verify your identity, then set a new one.
                </p>

                <form className="ep-form" onSubmit={handlePasswordSave}>

                  <div className="ep-field">
                    <label>Current Password</label>
                    <div className="ep-password-input">
                      <input
                        type={showCurrent ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => { setCurrentPassword(e.target.value); setPasswordMsg(null) }}
                        placeholder="Enter current password"
                      />
                      <button type="button" className="ep-eye" onClick={() => setShowCurrent(!showCurrent)}>
                        {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="ep-field">
                    <label>New Password</label>
                    <div className="ep-password-input">
                      <input
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); setPasswordMsg(null) }}
                        placeholder="Min. 6 characters"
                      />
                      <button type="button" className="ep-eye" onClick={() => setShowNew(!showNew)}>
                        {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="ep-field">
                    <label>Confirm New Password</label>
                    <div className="ep-password-input">
                      <input
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={e => { setConfirmPassword(e.target.value); setPasswordMsg(null) }}
                        placeholder="Repeat new password"
                      />
                      <button type="button" className="ep-eye" onClick={() => setShowConfirm(!showConfirm)}>
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* password strength bar */}
                  {newPassword && (
                    <div className="ep-strength">
                      <div className="ep-strength-bar">
                        <div
                          className={`ep-strength-fill ${
                            newPassword.length < 6 ? "weak" :
                            newPassword.length < 10 ? "medium" : "strong"
                          }`}
                          style={{
                            width: newPassword.length < 6 ? "33%" :
                                   newPassword.length < 10 ? "66%" : "100%"
                          }}
                        />
                      </div>
                      <span className="ep-strength-label">
                        {newPassword.length < 6 ? "Weak" :
                         newPassword.length < 10 ? "Medium" : "Strong"}
                      </span>
                    </div>
                  )}

                  {passwordMsg && (
                    <div className={`ep-msg ${passwordMsg.type}`}>
                      {passwordMsg.type === "success"
                        ? <CheckCircle size={15} />
                        : <XCircle size={15} />
                      }
                      {passwordMsg.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="ep-btn-primary"
                    disabled={passwordSaving}
                  >
                    {passwordSaving ? "Updating..." : "Update Password"}
                  </button>

                </form>

              </div>

              {/* PAYOUT SETTINGS */}
              <div className="ep-card ep-password-card" style={{ marginTop: "20px" }}>
                <div className="ep-card-header">
                  <Landmark size={18} />
                  <h3>Payout Settings (Escrow)</h3>
                </div>
                <p className="ep-password-hint">
                  Link your bank account to receive funds. When you reach a milestone, funds are safely transferred from the Escrow to this account.
                </p>
                <form className="ep-form" onSubmit={handleBankSave}>
                  <div className="ep-field">
                    <label>Account Holder Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => { setBankName(e.target.value); setBankMsg(null) }}
                      placeholder="Name exactly as on bank account"
                    />
                  </div>
                  <div className="ep-field">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={bankNum}
                      onChange={e => { setBankNum(e.target.value); setBankMsg(null) }}
                      placeholder="Bank Account Number"
                    />
                  </div>
                  <div className="ep-field">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      value={bankIfsc}
                      onChange={e => { setBankIfsc(e.target.value.toUpperCase()); setBankMsg(null) }}
                      placeholder="e.g. HDFC0001234"
                    />
                  </div>
                  {bankMsg && (
                    <div className={`ep-msg ${bankMsg.type}`}>
                      {bankMsg.type === "success" ? <CheckCircle size={15} /> : <XCircle size={15} />}
                      {bankMsg.text}
                    </div>
                  )}
                  <button type="submit" className="ep-btn-primary" disabled={bankSaving}>
                    {bankSaving ? "Linking..." : "Link Bank Account"}
                  </button>
                </form>
              </div>

            </div>

          </div>

        )}

      </div>
    </div>
  )
}