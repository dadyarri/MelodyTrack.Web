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
  IconButton,
  Tooltip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import { serviceService } from '../services/service'
import { Service } from '../types/service'
import ServiceFormModal from '../components/ServiceFormModal'

const Services = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await serviceService.getOwnedServices()
      setServices(response)
    } catch (err) {
      setError('Ошибка при загрузке услуг')
      console.error('Error fetching services:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchServices()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchServices()
  }, [])

  const handleServiceCreated = () => {
    fetchServices()
  }

  if (loading && services.length === 0) {
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
          Услуги
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Обновить список">
            <IconButton 
              onClick={handleRefresh} 
              disabled={refreshing}
              color="primary"
            >
              <RefreshIcon sx={{ 
                transform: refreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s ease-in-out'
              }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Добавить услугу
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
              <TableCell>Название</TableCell>
              <TableCell>Описание</TableCell>
              <TableCell>Текущая цена</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>{service.name}</TableCell>
                <TableCell>{service.description}</TableCell>
                <TableCell>
                  {service.currentPrice.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ServiceFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onServiceCreated={handleServiceCreated}
      />
    </Stack>
  )
}

export default Services 