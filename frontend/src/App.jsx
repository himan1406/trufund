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

<Route path="/dashboard" element={<Dashboard />} />

function App() {
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

      </Routes>

    </Router>
  );
}

export default App;