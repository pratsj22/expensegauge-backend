import express from 'express'
import { addExpense, editExpense, getExpenses, removeExpense } from '../controllers/expenseController.js'

const router= express.Router()

router.post('/add',addExpense)
router.get('/get-expense/',getExpenses)
router.delete('/:id',removeExpense)
router.patch('/:id',editExpense)

export default router