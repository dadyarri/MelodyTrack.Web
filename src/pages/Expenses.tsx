import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Pagination,
  IconButton,
  Tooltip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import { expenseService } from '../services/expense'
import { Expense } from '../types/expense'
import ExpenseFormModal from '../components/ExpenseFormModal'

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deletingExpenseId, setDeletingExpenseId] = useState<number | null>(null)
  const pageSize = 10

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await expenseService.getExpenses(page, pageSize)
      setExpenses(response.data)
      setTotalPages(Math.ceil(response.info.total / pageSize))
    } catch (err) {
      setError('Ошибка при загрузке расходов')
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchExpenses()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchExpenses()
  }, [page])

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
  }

  const handleExpenseCreated = () => {
    fetchExpenses()
  }

  const handleDeleteClick = (expenseId: number) => {
    if (deletingExpenseId === expenseId) {
      // Second click - actually delete the expense
      handleDelete(expenseId)
    } else {
      // First click - show confirmation
      setDeletingExpenseId(expenseId)
    }
  }

  const handleDelete = async (expenseId: number) => {
    try {
      await expenseService.deleteExpense(expenseId)
      setDeletingExpenseId(null)
      fetchExpenses() // Refresh the list
    } catch (err) {
      setError('Ошибка при удалении расхода')
      console.error('Error deleting expense:', err)
      setDeletingExpenseId(null)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h2" component="h1">
          Расходы
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Обновить список">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon sx={{ transform: refreshing ? 'rotate(180deg)' : 'none' }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Добавить расход
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Сумма</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  {new Date(expense.date).toLocaleDateString('ru-RU')}
                </TableCell>
                <TableCell>{expense.description}</TableCell>
                <TableCell>
                  {expense.amount.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDeleteClick(expense.id)}
                  >
                    {deletingExpenseId === expense.id ? 'Точно?' : 'Удалить'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="center" mt={2}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
          size="large"
        />
      </Box>

      <ExpenseFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onExpenseCreated={handleExpenseCreated}
      />
    </Stack>
  )
}

export default Expenses 