import {useState, useEffect} from 'react'
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Chip,
    Stack,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    Divider, TextField, Autocomplete
} from '@mui/material'
import {format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO} from 'date-fns'
import {ru} from 'date-fns/locale'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventIcon from '@mui/icons-material/Event';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import {scheduleService} from '../services/serviceHistory'
import {CreateServiceScheduleRequest, ServiceHistory} from '../types/serviceHistory'
import React from 'react'
import {Client} from "../types/client.ts";
import {Service} from "../types/service.ts";
import {clientService} from "../services/client.ts";
import {serviceService} from "../services/service.ts";
import SaveIcon from "@mui/icons-material/Save";

const ServiceCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')
    const [modalOpen, setModalOpen] = useState(false)
    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ day: Date, hour: number } | null>(null)
    const [selectedReservations, setSelectedReservations] = useState<ServiceHistory[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [services, setServices] = useState<Service[]>([])
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [selectedService, setSelectedService] = useState<Service | null>(null)

    // Get the start and end of the current week
    const weekStart = startOfWeek(currentDate, {weekStartsOn: 1}) // Start from Monday
    const weekEnd = endOfWeek(currentDate, {weekStartsOn: 1})

    // Generate array of days in the current week
    const weekDays = Array.from({length: 7}, (_, i) => addDays(weekStart, i))

    // Format time slots (9:00 - 21:00)
    const timeSlots = Array.from({length: 12}, (_, i) => i + 9)

    const fetchData = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await scheduleService.getSchedule(
                format(weekStart, 'yyyy-MM-dd'),
                format(weekEnd, 'yyyy-MM-dd'),
                Intl.DateTimeFormat().resolvedOptions().timeZone
            )

            setServiceHistory(response)

            const clientsResponse = await clientService.getClients(1, 100)
            setClients(clientsResponse.data)

            const servicesResponse = await serviceService.getOwnedServices()
            setServices(servicesResponse)

        } catch (err) {
            setError('Ошибка при загрузке расписания')
            console.error('Error fetching service history:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [currentDate])

    const handlePreviousWeek = () => {
        setCurrentDate(prev => addDays(prev, -7))
    }

    const handleNextWeek = () => {
        setCurrentDate(prev => addDays(prev, 7))
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    const getReservationsForTimeSlot = (day: Date, hour: number) => {
        return serviceHistory.filter(history => {
            const startDate = parseISO(history.startDate)
            return isSameDay(startDate, day) && startDate.getHours() === hour
        })
    }

    const handleTimeSlotClick = (day: Date, hour: number) => {
        const reservations = getReservationsForTimeSlot(day, hour)
        setSelectedSlot({day, hour})
        setSelectedReservations(reservations)
        setModalOpen(true)
    }

    const handleCloseModal = () => {
        setModalOpen(false)
    }

    const handleCreateNewReservation = () => {
        handleCloseModal()
        setCreateModalOpen(true)
    }

    const handleCreateModalClose = () => {
        setCreateModalOpen(false)
        setSelectedSlot(null)
        setSelectedService(null)
        setSelectedClient(null)
    }

    const handleSaveSchedule = async () => {
        if (selectedClient && selectedService && selectedSlot) {
            selectedSlot.day.setHours(selectedSlot?.hour)
            const entry = {
                clientId: selectedClient.id,
                serviceId: selectedService.id,
                start: selectedSlot.day,
            } as CreateServiceScheduleRequest

            await scheduleService.createServiceSchedule(entry)
            await fetchData()
            handleCreateModalClose()
        }

    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress/>
            </Box>
        )
    }

    return (
        <Box sx={{p: 3}}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3}}>
                <Typography variant="h4">
                    Расписание услуг
                </Typography>

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Обновить">
                        <IconButton onClick={fetchData} color="primary">
                            <RefreshIcon/>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Предыдущая неделя">
                        <IconButton onClick={handlePreviousWeek} color="primary">
                            <ChevronLeftIcon/>
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="outlined"
                        startIcon={<EventIcon/>}
                        onClick={handleToday}
                    >
                        Сегодня
                    </Button>

                    <Tooltip title="Следующая неделя">
                        <IconButton onClick={handleNextWeek} color="primary">
                            <ChevronRightIcon/>
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Typography variant="h6" sx={{mb: 2}}>
                {format(weekStart, 'd MMMM', {locale: ru})} - {format(weekEnd, 'd MMMM yyyy', {locale: ru})}
            </Typography>

            {error && (
                <Alert severity="error" sx={{mb: 2}}>
                    {error}
                </Alert>
            )}

            <Paper sx={{overflow: 'auto'}}>
                <Grid container>
                    {/* Time column */}
                    <Grid size={{xs: 1}}>
                        <Box sx={{borderRight: 1, borderColor: 'divider', height: '100%'}}>
                            <Box sx={{
                                height: 60,
                                borderBottom: 1,
                                borderColor: 'divider',
                                p: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Typography variant="subtitle2">Время</Typography>
                            </Box>
                            {timeSlots.map(hour => (
                                <Box
                                    key={hour}
                                    sx={{
                                        height: 100,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        p: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Typography variant="body2">{`${hour}:00`}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Grid>

                    {/* Days columns */}
                    {weekDays.map(day => (
                        <Grid size={{xs: 1.57}} key={day.toISOString()}>
                            <Box sx={{borderRight: 1, borderColor: 'divider', height: '100%'}}>
                                <Box
                                    sx={{
                                        height: 60,
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        p: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: isSameDay(day, new Date()) ? 'primary.light' : 'inherit',
                                        color: isSameDay(day, new Date()) ? 'primary.contrastText' : 'inherit'
                                    }}
                                >
                                    <Typography variant="subtitle2">
                                        {format(day, 'EEEE', {locale: ru})}
                                    </Typography>
                                    <Typography variant="body2">
                                        {format(day, 'd MMM', {locale: ru})}
                                    </Typography>
                                </Box>

                                {timeSlots.map(hour => {
                                    const reservations = getReservationsForTimeSlot(day, hour)

                                    return (
                                        <Box
                                            key={hour}
                                            sx={{
                                                height: 100,
                                                borderBottom: 1,
                                                borderColor: 'divider',
                                                p: 1,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.5,
                                                cursor: 'pointer',
                                                '&:hover': {
                                                    bgcolor: 'action.hover'
                                                }
                                            }}
                                            onClick={() => handleTimeSlotClick(day, hour)}
                                        >
                                            {reservations.map(reservation => (
                                                <Chip
                                                    key={reservation.id}
                                                    label={`${reservation.client.firstName} ${reservation.client.lastName} - ${reservation.service.name}`}
                                                    size="small"
                                                    color={reservation.completed ? "success" : "primary"}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        maxWidth: '100%',
                                                        '& .MuiChip-label': {
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            display: 'block',
                                                            width: '100%'
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )
                                })}
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Time Slot Modal */}
            <Dialog
                open={modalOpen}
                onClose={handleCloseModal}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {selectedSlot && `${format(selectedSlot.day, 'EEEE, d MMMM', {locale: ru})} - ${selectedSlot.hour}:00`}
                </DialogTitle>
                <DialogContent>
                    {selectedReservations.length > 0 ? (
                        <List>
                            {selectedReservations.map((reservation, index) => (
                                <React.Fragment key={reservation.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={`${reservation.client.firstName} ${reservation.client.lastName} - ${reservation.service.name}`}
                                            secondary={`Статус: ${reservation.completed ? 'Завершено' : 'Ожидает'}`}
                                        />
                                    </ListItem>
                                    {index < selectedReservations.length - 1 && <Divider/>}
                                </React.Fragment>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{textAlign: 'center', py: 3}}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Нет записей на это время
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Закрыть</Button>
                    {selectedReservations.length === 0 && <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon/>}
                        onClick={handleCreateNewReservation}
                    >
                        Создать запись
                    </Button>}
                </DialogActions>
            </Dialog>

            {/* Create slot modal*/}
            <Dialog open={createModalOpen}
                    onClose={handleCreateModalClose}
                    maxWidth="sm"
                    fullWidth>
                <DialogTitle>
                    {selectedSlot && `Занять слот ${format(selectedSlot.day, 'EEEE, d MMMM', {locale: ru})} - ${selectedSlot.hour}:00`}
                </DialogTitle>
                <DialogContent>
                    <Box>
                        <Autocomplete renderInput={(params) => <TextField {...params} label={"Клиент"}/>}
                                      options={clients}
                                      renderOption={(props, option) => {
                                          const {key, ...optionProps} = props;
                                          return (<Box key={key} component={"li"} {...optionProps}>
                                              {option.firstName} {option.lastName}
                                          </Box>)
                                      }}
                                      onChange={(_event, value, _reason) => {
                                          setSelectedClient(value)
                                      }}
                                      getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                                      sx={{p: 2}}
                        />
                        <Autocomplete renderInput={(params) => <TextField {...params} label={"Услуга"}/>}
                                      options={services}
                                      renderOption={(props, option) => {
                                          const {key, ...optionProps} = props;
                                          return (<Box key={key} component={"li"} {...optionProps}>
                                              {option.name}
                                          </Box>)
                                      }}
                                      getOptionLabel={(option) => option.name}
                                      sx={{p: 2}}
                                      onChange={(_event, value, _reason) => {
                                          setSelectedService(value)
                                      }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCreateModalClose}>Закрыть</Button>
                    <IconButton
                        onClick={handleSaveSchedule}
                        disabled={loading}
                        color="primary"
                    >
                        <SaveIcon/>
                    </IconButton>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

export default ServiceCalendar 