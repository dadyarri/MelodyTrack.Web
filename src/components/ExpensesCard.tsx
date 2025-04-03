import { useEffect, useState } from 'react'
import { Card, CardContent, Typography, Box, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { expenseService } from '../services/expense'
import { CurrentMonthExpensesResponse } from '../types/expense'

const ExpensesCard = () => {
  const [data, setData] = useState<CurrentMonthExpensesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchCurrentMonthExpenses = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await expenseService.getCurrentMonthExpenses()
      setData(response)
    } catch (err) {
      setError('Ошибка при загрузке расходов')
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCurrentMonthExpenses()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchCurrentMonthExpenses()
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Расходы за текущий месяц
          </Typography>
          <Tooltip title="Обновить">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              size="small"
            >
              <RefreshIcon sx={{ 
                transform: refreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s ease-in-out'
              }} />
            </IconButton>
          </Tooltip>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1">
            Количество расходов: {data?.count || 0}
          </Typography>
          <Typography variant="h6" color="error">
            {(data?.totalAmount || 0).toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB'
            })}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ExpensesCard 