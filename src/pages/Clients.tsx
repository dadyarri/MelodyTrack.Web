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
import { clientService } from '../services/client'
import { Client } from '../types/client'
import ClientFormModal from '../components/ClientFormModal'
import ClientDetailsModal from '../components/ClientDetailsModal'

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null)
  const pageSize = 10

  const fetchClients = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await clientService.getClients(page, pageSize)
      console.log(response.data)
      setClients(response.data)
      setTotalPages(Math.ceil(response.info.total / pageSize))
    } catch (err) {
      setError('Ошибка при загрузке клиентов')
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchClients()
    setRefreshing(false)
  }

  useEffect(() => {
    fetchClients()
  }, [page])

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value)
  }

  const handleClientCreated = () => {
    // Refresh the clients list
    fetchClients()
  }

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client)
    setIsDetailsModalOpen(true)
  }

  const handleDeleteClick = (clientId: number) => {
    if (deletingClientId === clientId) {
      // Second click - actually delete the client
      handleDelete(clientId)
    } else {
      // First click - show confirmation
      setDeletingClientId(clientId)
    }
  }

  const handleDelete = async (clientId: number) => {
    try {
      await clientService.deleteClient(clientId)
      setDeletingClientId(null)
      fetchClients() // Refresh the list
    } catch (err) {
      setError('Ошибка при удалении клиента')
      console.error('Error deleting client:', err)
      setDeletingClientId(null)
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
          Клиенты
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
            onClick={() => setIsCreateModalOpen(true)}
          >
            Создать клиента
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
              <TableCell>Имя</TableCell>
              <TableCell>Фамилия</TableCell>
              <TableCell>Баланс</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.firstName}</TableCell>
                <TableCell>{client.lastName}</TableCell>
                <TableCell>
                  <Typography 
                    color={client.balance >= 0 ? 'success.main' : 'error.main'}
                    fontWeight="medium"
                  >
                    {client.balance.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB'
                    })}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewDetails(client)}
                    >
                      Подробнее
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteClick(client.id)}
                    >
                      {deletingClientId === client.id ? 'Точно?' : 'Удалить'}
                    </Button>
                  </Stack>
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

      <ClientFormModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onClientCreated={handleClientCreated}
      />

      <ClientDetailsModal
        open={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        onClientUpdated={() => {
          handleClientCreated();
          setIsDetailsModalOpen(false)
        }}
      />
    </Stack>
  )
}

export default Clients 