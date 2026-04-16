import { useState } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/navbar_temp"

import "../styles/auth.css"
import "../styles/forms.css"
import "../styles/buttons.css"

import { FaEye, FaEyeSlash } from "react-icons/fa"

export default function AuthPage(){

const navigate = useNavigate()

const [signup,setSignup] = useState(false)
const [showPassword,setShowPassword] = useState(false)

const [username,setUsername] = useState("")
const [email,setEmail] = useState("")
const [password,setPassword] = useState("")
const [rememberMe,setRememberMe] = useState(false)

const [error,setError] = useState("")

/* LOGIN */

const loginUser = async (e) => {

e.preventDefault()

if(!email || !password){
setError("Please enter email and password")
return
}

try{

const res = await fetch("http://localhost:5000/api/auth/login",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
credentials:"include",
body:JSON.stringify({
email,
password,
remember:rememberMe
})
})

const data = await res.json()

if(!res.ok){
setError(data.error || "Login failed")
return
}

setError("")

/* store username */

localStorage.setItem("username",data.user.username)

/* go to dashboard */

navigate("/dashboard")

}catch{
setError("Server error. Please try again.")
}

}

/* SIGNUP */

const signupUser = async (e) => {

e.preventDefault()

if(!username || !email || !password){
setError("Please fill all fields")
return
}

try{

const res = await fetch("http://localhost:5000/api/auth/signup",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
username,
full_name: username,
email,
password
})
})

const data = await res.json()

if(!res.ok){
setError(data.error || "Signup failed")
return
}

/* reset fields */

setUsername("")
setEmail("")
setPassword("")

/* switch to login */

setSignup(false)

setError("Account created successfully. Please log in.")

}catch{
setError("Server error. Please try again.")
}

}

/* CLEAR ERROR WHEN TYPING */

const handleEmail = (e)=>{
setEmail(e.target.value)
setError("")
}

const handlePassword = (e)=>{
setPassword(e.target.value)
setError("")
}

const handleUsername = (e)=>{
setUsername(e.target.value)
setError("")
}

/* PARALLAX */

const handleMouseMove = (e) => {

const card = document.querySelector(".login-card")

const x = (window.innerWidth/2 - e.clientX) / 400
const y = (window.innerHeight/2 - e.clientY) / 400

card.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`

}

const resetCard = () => {

const card = document.querySelector(".login-card")
card.style.transform = "rotateY(0deg) rotateX(0deg)"

}

return(

<div className="auth-container">

<Navbar/>

<div className="welcome-text">
<h1 className="welcome-title">
{signup ? "Welcome" : "Welcome Back"}
</h1>
</div>

<div className="login-wrapper">

<div
className="login-card"
onMouseMove={handleMouseMove}
onMouseLeave={resetCard}
>

<h2 className="auth-title">
{signup ? "Sign up" : "Log in"}
</h2>

<form
className="form-content"
onSubmit={signup ? signupUser : loginUser}
>

{signup && (
<>
<label>Username</label>

<input
type="text"
value={username}
onChange={handleUsername}
/>
</>
)}

<label>Email</label>

<input
type="email"
value={email}
onChange={handleEmail}
/>

<label>Password</label>

<div className="password-field">

<input
type={showPassword ? "text" : "password"}
value={password}
onChange={handlePassword}
/>

<span
className="eye-icon"
onClick={()=>setShowPassword(!showPassword)}
>

{showPassword ? <FaEyeSlash/> : <FaEye/>}

</span>

</div>

{error && (
<p className="auth-error">
{error}
</p>
)}

{!signup && (

<div className="options">

<label className="remember">

<input
type="checkbox"
checked={rememberMe}
onChange={(e)=>setRememberMe(e.target.checked)}
/>

<span>Remember me</span>

</label>

<a className="forgot">Forgot Password?</a>

</div>

)}

<button
type="submit"
className="primary-btn"
>
{signup ? "Create Account" : "Log in"}
</button>

</form>

<div className="divider">Or</div>

<button
className="secondary-btn"
onClick={()=>{
setSignup(!signup)
setError("")
}}
>

{signup ? "Log in" : "Sign up"}

</button>

</div>

</div>

</div>

)

}
