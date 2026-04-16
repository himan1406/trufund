import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard"
import LoadingScreen from "./pages/LoadingScreen"
import Profile from "./pages/Profile"
import DonorHistory from "./pages/DonorHistory"
import EditProfile from "./pages/EditProfile"
import PublicProfile from "./pages/PublicProfile"
import Following from "./pages/Following"
import HashtagFeed from "./pages/HashtagFeed"
import Feed from "./pages/Feed"
import CreatorStudio from "./pages/CreatorStudio"
import EventFeed from "./pages/EventFeed"
import EventDetail from "./pages/EventDetail"
import AdminDashboard from "./pages/AdminDashboard"
import Leaderboard from "./pages/Leaderboard"
import Settings from "./pages/Settings"

import { useEffect } from "react"

function App() {
  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem("theme") || "light"
      document.body.className = ""
      if (theme !== "light") {
        document.body.classList.add(`theme-${theme}`)
      }
    }
    applyTheme()

    // Listen for custom theme updates from inside Settings.jsx
    window.addEventListener("themeChange", applyTheme)
    return () => window.removeEventListener("themeChange", applyTheme)
  }, [])

  return (
    <Router>

      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/login" element={<AuthPage />} />

        <Route path="/about" element={<About />} />

        <Route path="/contact" element={<Contact />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/profile" element={<Profile />} />

        <Route path="/donor-history" element={<DonorHistory />} />

        <Route path="/edit-profile" element={<EditProfile />} />

        <Route path="/profile/:username" element={<PublicProfile />} />

        <Route path="/following" element={<Following />} />

        <Route path="/hashtag/:tag" element={<HashtagFeed />} />

        <Route path="/feed" element={<Feed />} />

        <Route path="/creator-studio" element={<CreatorStudio />} />

        <Route path="/events" element={<EventFeed />} />

        <Route path="/events/:id" element={<EventDetail />} />

        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route path="/settings" element={<Settings />} />

      </Routes>

    </Router>
  );
}

export default App;