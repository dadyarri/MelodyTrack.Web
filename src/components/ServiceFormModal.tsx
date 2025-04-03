import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
} from '@mui/material'
import { serviceService } from '../services/service'
import { CreateServiceData } from '../types/service'

interface ServiceFormModalProps {
  open: boolean
  onClose: () => void
  onServiceCreated: () => void
}

const ServiceFormModal = ({ open, onClose, onServiceCreated }: ServiceFormModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError('')

      if (!name || !price || isNaN(Number(price)) || Number(price) <= 0) {
        setError('Заполните все поля корректно')
        return
      }

      const serviceData: CreateServiceData = {
        name,
        description,
        price: Number(price)
      }

      await serviceService.createService(serviceData)
      onServiceCreated()
      handleClose()
    } catch (err) {
      setError('Ошибка при создании услуги')
      console.error('Error creating service:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setPrice('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Добавить услугу</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Цена"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Отмена</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ServiceFormModal