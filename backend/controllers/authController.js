const pool = require("../config/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

/* =========================
   SIGNUP CONTROLLER
========================= */

exports.signup = async (req,res)=>{

console.log("\n===== SIGNUP REQUEST =====")
console.log("Request Body:", req.body)

try{

const {username,full_name,email,password} = req.body || {}

console.log("Parsed fields:", {username,full_name,email,password})

if(!username || !full_name || !email || !password){

console.log("VALIDATION FAILED - Missing fields")

return res.status(400).json({
error:"All fields are required"
})

}

console.log("Hashing password...")

const hashedPassword = await bcrypt.hash(password,10)

console.log("Password hashed:", hashedPassword)

/* INSERT USER */

console.log("Inserting user into database...")

const user = await pool.query(
`INSERT INTO users
(username,full_name,email,password_hash)
VALUES($1,$2,$3,$4)
RETURNING user_id,username,email`,
[username,full_name,email,hashedPassword]
)

console.log("USER CREATED SUCCESSFULLY:", user.rows[0])

res.json({
message:"Signup successful",
user:user.rows[0]
})

}catch(err){

console.error("SIGNUP ERROR:", err)

res.status(500).json({
error:"Signup failed",
details: err.message
})

}

}


/* =========================
   LOGIN CONTROLLER
========================= */

exports.login = async (req,res)=>{

console.log("\n===== LOGIN REQUEST =====")
console.log("Request Body:", req.body)

try{

const {email,password,remember} = req.body || {}

console.log("Parsed fields:", {email,password,remember})

if(!email || !password){

console.log("VALIDATION FAILED - Missing email or password")

return res.status(400).json({
error:"Email and password required"
})

}

console.log("LOGIN ATTEMPT:", email)

/* CHECK USER */

console.log("Searching user in database...")

const user = await pool.query(
"SELECT * FROM users WHERE email=$1",
[email]
)

if(user.rows.length===0){

console.log("USER NOT FOUND")

return res.status(401).json({
error:"User not found"
})

}

console.log("USER FOUND:", user.rows[0].email)
console.log("Stored hash:", user.rows[0].password_hash)

/* PASSWORD CHECK */

console.log("Comparing password with bcrypt...")

const valid = await bcrypt.compare(
password.trim(),
user.rows[0].password_hash
)

console.log("Password match result:", valid)

if(!valid){

console.log("INVALID PASSWORD")

return res.status(401).json({
error:"Invalid password"
})

}

/* CREATE TOKEN */

console.log("Generating JWT token...")

const token = jwt.sign(
{user_id:user.rows[0].user_id},
process.env.JWT_SECRET || "dev_secret",
{expiresIn: remember ? "30d" : "1h"}
)

console.log("JWT TOKEN CREATED")

/* SET COOKIE */

res.cookie("token",token,{
httpOnly:true
})

console.log("Cookie sent to client")

res.json({
message:"Login successful",
user:{
id:user.rows[0].user_id,
username:user.rows[0].username,
email:user.rows[0].email
}
})

}catch(err){

console.error("LOGIN ERROR:", err)

res.status(500).json({
error:"Login failed",
details: err.message
})

}

}