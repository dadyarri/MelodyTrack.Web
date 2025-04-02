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
import { clientService } from '../services/client'
import { Telegram } from '@mui/icons-material'

interface ClientFormModalProps {
  open: boolean
  onClose: () => void
  onClientCreated: () => void
}

const ClientFormModal = ({ open, onClose, onClientCreated }: ClientFormModalProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const clientData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      contacts: {
        phone: formData.get('phone') as string,
        telegram: formData.get('telegram') as string,
        vk: formData.get('vk') as string,
      }
    }

    try {
      await clientService.createClient(clientData)
      onClientCreated()
      onClose()
    } catch (err) {
      setError('Ошибка при создании клиента')
      console.error('Error creating client:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Создать нового клиента</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              fullWidth
              label="Имя"
              name="firstName"
              autoComplete="given-name"
            />
            <TextField
              required
              fullWidth
              label="Фамилия"
              name="lastName"
              autoComplete="family-name"
            />
            <TextField
              required
              fullWidth
              label="Telegram"
              name="telegram"
              autoComplete="telegram"
            />
            <TextField
              required
              fullWidth
              label="VK"
              name="vk"
              autoComplete="vk"
            />
            <TextField
              required
              fullWidth
              label="Телефон"
              name="phone"
              autoComplete="tel"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Создать
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ClientFormModal 