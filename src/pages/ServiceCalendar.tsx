import { useState, useEffect } from 'react'
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
    Button
} from '@mui/material'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventIcon from '@mui/icons-material/Event';
import { scheduleService } from '../services/serviceHistory'
import { ServiceHistory } from '../types/serviceHistory'

const ServiceCalendar = () => {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string>('')

    // Get the start and end of the current week
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Start from Monday
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

    // Generate array of days in the current week
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    // Format time slots (9:00 - 21:00)
    const timeSlots = Array.from({ length: 12 }, (_, i) => i + 9)

    const fetchServiceHistory = async () => {
        try {
            setLoading(true)
            setError('')

            const response = await scheduleService.getSchedule(
                format(weekStart, 'yyyy-MM-dd'),
                format(weekEnd, 'yyyy-MM-dd')
            )

            setServiceHistory(response.data)
        } catch (err) {
            setError('Ошибка при загрузке расписания')
            console.error('Error fetching service history:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchServiceHistory()
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

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Расписание услуг
                </Typography>

                <Stack direction="row" spacing={1}>
                    <Tooltip title="Предыдущая неделя">
                        <IconButton onClick={handlePreviousWeek} color="primary">
                            <ChevronLeftIcon />
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="outlined"
                        startIcon={<EventIcon />}
                        onClick={handleToday}
                    >
                        Сегодня
                    </Button>

                    <Tooltip title="Следующая неделя">
                        <IconButton onClick={handleNextWeek} color="primary">
                            <ChevronRightIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            <Typography variant="h6" sx={{ mb: 2 }}>
                {format(weekStart, 'd MMMM', { locale: ru })} - {format(weekEnd, 'd MMMM yyyy', { locale: ru })}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ overflow: 'auto' }}>
                <Grid container>
                    {/* Time column */}
                    <Grid size={{ xs: 1 }}>
                        <Box sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}>
                            <Box sx={{ height: 60, borderBottom: 1, borderColor: 'divider', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                        <Grid size={{ xs: 1.57 }} key={day.toISOString()}>
                            <Box sx={{ borderRight: 1, borderColor: 'divider', height: '100%' }}>
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
                                        {format(day, 'EEEE', { locale: ru })}
                                    </Typography>
                                    <Typography variant="body2">
                                        {format(day, 'd MMM', { locale: ru })}
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
                                                gap: 0.5
                                            }}
                                        >
                                            {reservations.map(reservation => (
                                                <Chip
                                                    key={reservation.id}
                                                    label={`${reservation.client.name} - ${reservation.service.name}`}
                                                    size="small"
                                                    color={reservation.completed ? "success" : "primary"}
                                                    sx={{
                                                        maxWidth: '100%',
                                                        '& .MuiChip-label': {
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
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
        </Box>
    )
}

export default ServiceCalendar 