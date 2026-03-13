import { Link } from "react-router-dom"
import "../styles/navbar.css"

export default function Navbar(){

return(

<nav className="navbar">

<div className="nav-left">

<div className="logo-block">

<h1 className="logo">TruFund</h1>

</div>

<div className="nav-links">

<Link to="/">HOME</Link>
<Link to="/about">ABOUT US</Link>
<Link to="/contact">CONTACT</Link>
<Link to="/login">LOG IN</Link>

</div>

</div>

</nav>

)

}