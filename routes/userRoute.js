import express from 'express'
import { changePassword, login, logout, refresh, requestPasswordResetOTP, resetPassword, signup, verifyAccess } from '../controllers/userController.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.post('/logout', logout)
router.post('/changePassword', verifyAccess, changePassword)
router.post('/refresh', refresh)
router.post('/forgotPassword/requestOtp', requestPasswordResetOTP);
router.post('/forgotPassword/reset', resetPassword);

export default router