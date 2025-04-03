import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
} from '@mui/material'
import { expenseService } from '../services/expense'
import { CreateExpenseData } from '../types/expense'

interface ExpenseFormModalProps {
  open: boolean
  onClose: () => void
  onExpenseCreated: () => void
}

const ExpenseFormModal = ({ open, onClose, onExpenseCreated }: ExpenseFormModalProps) => {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!description.trim() || !amount.trim()) {
      setError('Пожалуйста, заполните все поля')
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Сумма должна быть положительным числом')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const expenseData: CreateExpenseData = {
        description: description.trim(),
        amount: amountValue
      }

      await expenseService.createExpense(expenseData)
      onExpenseCreated()
      handleClose()
    } catch (err) {
      setError('Ошибка при создании расхода')
      console.error('Error creating expense:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDescription('')
    setAmount('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Добавить расход</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}
            <TextField
              label="Описание"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              fullWidth
              error={!!error}
            />
            <TextField
              label="Сумма"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              error={!!error}
              inputProps={{
                step: '0.01',
                min: '0'
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Создание...' : 'Создать'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ExpenseFormModal 