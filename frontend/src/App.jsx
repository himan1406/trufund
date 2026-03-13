import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard"
import LoadingScreen from "./pages/LoadingScreen"

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

        

      </Routes>

    </Router>
  );
}

export default App;