import React, {useEffect, useState} from 'react'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    IconButton,
    Pagination,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import {paymentService} from "../services/payment.ts";
import {Payment} from "../types/payment.ts";
import PaymentFormModal from "../components/PaymentFormModal.tsx";

const Payments = () => {
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string>('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [deletingPaymentsId, setDeletingPaymentsId] = useState<number | null>(null)
    const pageSize = 10

    const fetchPayments = async () => {
        try {
            setLoading(true)
            setError('')
            const response = await paymentService.getPayments(page, pageSize)
            setPayments(response.data)
            setTotalPages(Math.ceil(response.info.total / pageSize))
        } catch (err) {
            setError('Ошибка при загрузке платежей')
            console.error('Error fetching payments:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchPayments()
        setRefreshing(false)
    }

    useEffect(() => {
        fetchPayments()
    }, [page])

    const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value)
    }

    const handlePaymentCreated = () => {
        fetchPayments()
    }

    const handleDeleteClick = (paymentId: number) => {
        if (deletingPaymentsId === paymentId) {
            // Second click - actually delete the expense
            handleDelete(paymentId)
        } else {
            // First click - show confirmation
            setDeletingPaymentsId(paymentId)
        }
    }

    const handleDelete = async (expenseId: number) => {
        try {
            await paymentService.deletePayment(expenseId)
            setDeletingPaymentsId(null)
            fetchPayments() // Refresh the list
        } catch (err) {
            setError('Ошибка при удалении дохода')
            console.error('Error deleting expense:', err)
            setDeletingPaymentsId(null)
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
        <Stack spacing={3}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Typography variant="h3" component="h1">
                    Платежи
                </Typography>
                <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                    <Tooltip title="Обновить список">
                        <IconButton
                            onClick={handleRefresh}
                            disabled={refreshing}
                            color="primary"
                        >
                            <RefreshIcon sx={{transform: refreshing ? 'rotate(180deg)' : 'none'}}/>
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon/>}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Добавить платёж
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
                            <TableCell>Дата</TableCell>
                            <TableCell>Клиент</TableCell>
                            <TableCell>Услуга</TableCell>
                            <TableCell>Сумма</TableCell>
                            <TableCell>Описание</TableCell>
                            <TableCell>Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {payments.map((payment) => (
                            <TableRow key={payment.id} sx={{
                                '&:nth-of-type(odd)': {
                                    backgroundColor: 'action.hover',
                                },
                            }}>
                                <TableCell>
                                    {new Date(payment.date).toLocaleDateString('ru-RU')}
                                </TableCell>
                                <TableCell>{`${payment.client.lastName} ${payment.client.firstName}`}</TableCell>
                                <TableCell>{payment.service?.name || "—"}</TableCell>
                                <TableCell>
                                    {payment.amount.toLocaleString('ru-RU', {
                                        style: 'currency',
                                        currency: 'RUB'
                                    })}
                                </TableCell>
                                <TableCell>{payment.description}</TableCell>

                                <TableCell>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        size="small"
                                        onClick={() => handleDeleteClick(payment.id)}
                                    >
                                        {deletingPaymentsId === payment.id ? 'Точно?' : 'Удалить'}
                                    </Button>
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

            <PaymentFormModal
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onPaymentCreated={handlePaymentCreated}
            />
        </Stack>
    )
}

export default Payments