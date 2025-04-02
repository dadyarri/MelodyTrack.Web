import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  TextField,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import { Client, UpdateClientRequest } from '../types/client'
import { clientService } from '../services/client'

interface ClientDetailsModalProps {
  open: boolean
  onClose: () => void
  client: Client | null
  onClientUpdated?: (updatedClient: Client) => void
}

type ContactField = 'phone' | 'vk' | 'telegram'
type MainField = 'firstName' | 'lastName'

const ClientDetailsModal = ({ open, onClose, client, onClientUpdated }: ClientDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedClient, setEditedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  if (!client) return null

  const handleEdit = () => {
    setEditedClient({ ...client })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setEditedClient(null)
    setIsEditing(false)
    setError('')
  }

  const handleSave = async () => {
    if (!editedClient) return

    try {
      setLoading(true)
      setError('')
      
      // Convert nested structure to flat structure for the API
      const updateData: UpdateClientRequest = {
        firstName: editedClient.firstName,
        lastName: editedClient.lastName,
        phone: editedClient.contacts.phone,
        vk: editedClient.contacts.vk,
        telegram: editedClient.contacts.telegram
      }

      const updatedClient = await clientService.updateClient(editedClient.id, updateData)
      setIsEditing(false)
      setEditedClient(null)
      onClientUpdated?.(updatedClient)
    } catch (err) {
      setError('Ошибка при обновлении данных клиента')
      console.error('Error updating client:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMainFieldChange = (field: MainField, value: string) => {
    if (!editedClient) return

    setEditedClient({
      ...editedClient,
      [field]: value
    })
  }

  const handleContactFieldChange = (field: ContactField, value: string) => {
    if (!editedClient) return

    setEditedClient({
      ...editedClient,
      contacts: {
        ...editedClient.contacts,
        [field]: value
      }
    })
  }

  const renderField = (label: string, value: string, field: MainField) => {
    if (isEditing) {
      return (
        <TextField
          fullWidth
          size="small"
          value={editedClient?.[field] || ''}
          onChange={(e) => handleMainFieldChange(field, e.target.value)}
          label={label}
          error={!!error}
          helperText={error}
        />
      )
    }

    return (
      <Typography variant="body1">{value}</Typography>
    )
  }

  const renderContactField = (
    label: string,
    value: string | undefined,
    field: ContactField
  ) => {
    if (isEditing) {
      return (
        <TextField
          fullWidth
          size="small"
          value={editedClient?.contacts[field] || ''}
          onChange={(e) => handleContactFieldChange(field, e.target.value)}
          label={label}
        />
      )
    }

    return value ? (
      <Typography variant="body1">{value}</Typography>
    ) : null
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Информация о клиенте</Typography>
          {!isEditing ? (
            <Tooltip title="Редактировать">
              <IconButton onClick={handleEdit} color="primary">
                <EditIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Box>
              <Tooltip title="Сохранить">
                <IconButton 
                  onClick={handleSave} 
                  disabled={loading}
                  color="primary"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Отмена">
                <IconButton onClick={handleCancel} color="error">
                  <CancelIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            {!isEditing && <Typography variant="subtitle2" color="text.secondary">
              Имя
            </Typography>}
            {renderField('Имя', client.firstName, 'firstName')}
          </Box>

          <Box>
            {!isEditing && <Typography variant="subtitle2" color="text.secondary">
              Фамилия
            </Typography>}
            {renderField('Фамилия', client.lastName, 'lastName')}
          </Box>

          <Divider />
          <Box>
            <Typography variant="h6">Контакты</Typography>
            <Stack spacing={2}>
              <Box>
                {!isEditing && client.contacts.phone && <Typography variant="subtitle2" color="text.secondary">
                  Телефон
                </Typography>}
                {renderContactField('Телефон', client.contacts.phone, 'phone')}
              </Box>
              <Box>
                {!isEditing && client.contacts.vk && <Typography variant="subtitle2" color="text.secondary">
                  VK
                </Typography>}
                {renderContactField('VK', client.contacts.vk, 'vk')}
              </Box>
              <Box>
                {!isEditing && client.contacts.telegram && <Typography variant="subtitle2" color="text.secondary">
                  Telegram
                </Typography>}
                {renderContactField('Telegram', client.contacts.telegram, 'telegram')}
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
      </DialogActions>
    </Dialog>
  )
}

export default ClientDetailsModal 