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

interface UpdateServicePriceModalProps {
  open: boolean
  onClose: () => void
  serviceId: number
  currentPrice: number
  onPriceUpdated: () => void
}

const UpdateServicePriceModal = ({ 
  open, 
  onClose, 
  serviceId, 
  currentPrice,
  onPriceUpdated 
}: UpdateServicePriceModalProps) => {
  const [price, setPrice] = useState(currentPrice.toString())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError('')

      if (!price || isNaN(Number(price)) || Number(price) <= 0) {
        setError('Введите корректную цену')
        return
      }

      await serviceService.updateServicePrice(serviceId, Number(price))
      onPriceUpdated()
      handleClose()
    } catch (err) {
      setError('Ошибка при обновлении цены')
      console.error('Error updating service price:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPrice(currentPrice.toString())
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Обновить цену услуги</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Новая цена"
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

export default UpdateServicePriceModal 