const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const authRoutes = require("./routes/auth")

const app = express()

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth", authRoutes)

app.listen(5000,()=>{
  console.log("Server running on port 5000")
})

app.post("/debug",(req,res)=>{
console.log("DEBUG BODY:",req.body)
res.json(req.body)
})