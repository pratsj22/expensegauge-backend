import express from 'express'
import { assignBalance, deleteUser, edituserExpense, getAllUsers, getUser, getUserExpenses, registerUser, removeUserExpense } from '../controllers/adminController.js'

const router = express.Router()

router.get('/users', getAllUsers)
router.get('/user/:userId', getUser)
router.get('/expenses/:userId', getUserExpenses)
router.post('/registeruser', registerUser)
router.delete('/delete/:userId', deleteUser)
router.delete('/expense/:userId/:id', removeUserExpense)
router.patch('/expense/:userId/:id', edituserExpense)
router.post('/assignBalance/:userId', assignBalance)

export default router