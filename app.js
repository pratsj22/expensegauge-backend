import express from 'express'
import userRoute from './routes/userRoute.js'
import expenseRoute from './routes/expenseRoute.js'
import adminRoute from './routes/adminRoute.js'
import { configDotenv } from 'dotenv'
import cors from 'cors'
import { connectDB } from './config/dbConnection.js'
import { verifyAccess } from './controllers/userController.js'
import { verifyAdminAccess } from './controllers/adminController.js'

configDotenv()
connectDB()
const app=express()
app.use(express.json())
const port=process.env.PORT || 3000

app.use(cors({
    origin:'http://localhost:8081',
    credentials:true
}))

app.get('/',(req,res)=>{
    res.send("ExpenseGauge server working fine")
})
app.use('/api/v1/user',userRoute)
app.use('/api/v1/expense',verifyAccess,expenseRoute)
app.use('/api/v1/admin',verifyAdminAccess,adminRoute)
app.listen(port,"0.0.0.0",()=>{
    console.log("server running on",port);
})

export default app