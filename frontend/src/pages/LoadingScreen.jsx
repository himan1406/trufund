import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../styles/loading.css"

import API_BASE_URL from "../utils/api"

export default function LoadingScreen(){

const navigate = useNavigate()
const [progress,setProgress] = useState(10)

useEffect(()=>{

let interval = setInterval(()=>{
setProgress((prev)=> prev < 90 ? prev + 5 : prev)
},150)

const verifyUser = async () => {

try{

const res = await fetch(`${API_BASE_URL}/api/auth/me`,{
credentials:"include"
})

if(res.ok){
setProgress(100)

setTimeout(()=>{
navigate("/dashboard")
},300)
}else{
navigate("/auth")
}

}catch{
navigate("/auth")
}

}

verifyUser()

return ()=> clearInterval(interval)

},[])

return(

<div className="loading-wrapper">

<h1 className="loading-logo">
TruFund
</h1>

<div className="progress-bar">

<div
className="progress"
style={{width:`${progress}%`}}
></div>

</div>

</div>

)

}