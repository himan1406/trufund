import { useState, useEffect } from "react"
import "../styles/settings.css"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import { Monitor, Moon, Sun, Shield } from "lucide-react"

export default function Settings() {
    const [profileImage, setProfileImage] = useState(null)
    const [theme, setTheme] = useState(localStorage.getItem("theme") || "light")
    const [anonymous, setAnonymous] = useState(localStorage.getItem("alwaysAnonymous") === "true")

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("http://localhost:5000/api/users/profile", { credentials: "include" })
                if (res.ok) {
                    const data = await res.json()
                    setProfileImage(data?.user?.profile_image || null)
                }
            } catch (err) { console.error(err) }
        }
        fetchProfile()
    }, [])

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme)
        localStorage.setItem("theme", newTheme)
        
        // Dispatch custom event so App.jsx hears it immediately
        window.dispatchEvent(new Event("themeChange"))
    }

    const handleAnonymousToggle = (e) => {
        const val = e.target.checked
        setAnonymous(val)
        localStorage.setItem("alwaysAnonymous", val ? "true" : "false")
    }

    return (
        <div className="dashboard-wrapper">
            <div className="background"></div>
            <div className="brand">TruFund</div>

            <Sidebar activePage="settings" />

            <div className="dashboard-card">
                <Topbar title="Settings" profileImage={profileImage} />

                <div className="settings-body">
                    
                    {/* APPEARANCE */}
                    <div className="settings-panel">
                        <h3>Appearance</h3>
                        <div className="settings-section">
                            <span className="settings-label">App Theme</span>
                            <div className="theme-options">
                                <div className={`theme-opt ${theme === 'light' ? 'active' : ''}`} onClick={() => handleThemeChange('light')}>
                                    <Sun size={18} /> Light Mode
                                </div>
                                <div className={`theme-opt ${theme === 'gray' ? 'active' : ''}`} onClick={() => handleThemeChange('gray')}>
                                    <Monitor size={18} /> Gray Mode
                                </div>
                                <div className={`theme-opt ${theme === 'dark' ? 'active' : ''}`} onClick={() => handleThemeChange('dark')}>
                                    <Moon size={18} /> Dark Mode
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRIVACY */}
                    <div className="settings-panel">
                        <h3>Privacy & Donations</h3>
                        <div className="settings-section">
                            <label className="checkbox-wrap">
                                <input 
                                    type="checkbox" 
                                    checked={anonymous} 
                                    onChange={handleAnonymousToggle} 
                                />
                                <span><Shield size={14} style={{verticalAlign:'middle', marginRight:'5px'}}/> Always donate anonymously</span>
                            </label>
                            <p style={{fontSize: '12px', color: '#777', marginTop: '4px'}}>
                                When checked, your username will be hidden from public event feeds by default when you make a donation.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
