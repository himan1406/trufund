const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const path = require("path")

const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/users")

const app = express()

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

/* serve uploaded profile pictures as static files */
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)

app.listen(5000, () => {
  console.log("Server running on port 5000")
})

app.post("/debug", (req, res) => {
  console.log("DEBUG BODY:", req.body)
  res.json(req.body)
})