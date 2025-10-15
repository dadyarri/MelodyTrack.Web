import {useEffect, useState} from 'react'
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
import EditIcon from '@mui/icons-material/Edit'
import {serviceService} from '../services/service'
import {Service} from '../types/service'
import ServiceFormModal from '../components/ServiceFormModal'
import UpdateServicePriceModal from '../components/UpdateServicePriceModal'

const Services = () => {
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string>('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
    const [selectedService, setSelectedService] = useState<Service | null>(null)

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

    const handleOpenPriceModal = (service: Service) => {
        setSelectedService(service)
        setIsPriceModalOpen(true)
    }

    const handleClosePriceModal = () => {
        setSelectedService(null)
        setIsPriceModalOpen(false)
    }

    if (loading && services.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress/>
            </Box>
        )
    }

    return (
        <Stack spacing={3}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography variant="h3" component="h1">
                    Услуги
                </Typography>
                <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                    <Tooltip title="Обновить список">
                        <IconButton
                            onClick={handleRefresh}
                            disabled={refreshing}
                            color="primary"
                        >
                            <RefreshIcon sx={{
                                transform: refreshing ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.3s ease-in-out'
                            }}/>
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon/>}
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
                <Table size={"small"}>
                    <TableHead>
                        <TableRow>
                            <TableCell>Название</TableCell>
                            <TableCell>Описание</TableCell>
                            <TableCell>Текущая цена</TableCell>
                            <TableCell align="right">Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {services.map((service) => (
                            <TableRow key={service.id} sx={{
                                '&:nth-of-type(odd)': {
                                    backgroundColor: 'action.hover',
                                },
                            }}>
                                <TableCell>{service.name}</TableCell>
                                <TableCell>{service.description}</TableCell>
                                <TableCell>
                                    {service.currentPrice.toLocaleString('ru-RU', {
                                        style: 'currency',
                                        currency: 'RUB'
                                    })}
                                </TableCell>
                                <TableCell align="right">
                                    <Tooltip title="Изменить цену">
                                        <IconButton
                                            onClick={() => handleOpenPriceModal(service)}
                                            color="primary"
                                            size="small"
                                        >
                                            <EditIcon/>
                                        </IconButton>
                                    </Tooltip>
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

            {selectedService && (
                <UpdateServicePriceModal
                    open={isPriceModalOpen}
                    onClose={handleClosePriceModal}
                    serviceId={selectedService.id}
                    currentPrice={selectedService.currentPrice}
                    onPriceUpdated={handleServiceCreated}
                />
            )}
        </Stack>
    )
}

export default Services 