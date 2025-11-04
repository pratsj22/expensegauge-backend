import express from 'express'
import { changePassword, login, logout, refresh, signup, verifyAccess } from '../controllers/userController.js'

const router= express.Router()

router.post('/signup',signup)
router.post('/login',login)
router.post('/logout',logout)
router.post('/changePassword',verifyAccess,changePassword)
router.post('/refresh',refresh)

export default router