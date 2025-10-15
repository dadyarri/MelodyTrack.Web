import {useEffect, useState} from 'react'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Box, Autocomplete,
} from '@mui/material'
import {paymentService} from '../services/payment'
import {Service} from "../types/service.ts";
import {serviceService} from "../services/service.ts";

interface PaymentFormModalProps {
    open: boolean
    onClose: () => void
    clientId: number
    onPaymentCreated: () => void
}

const PaymentFormModal = ({open, onClose, clientId, onPaymentCreated}: PaymentFormModalProps) => {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>('')
    const [services, setServices] = useState<Service[]>([])
    const [selectedService, setSelectedService] = useState<Service | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setServices(await serviceService.getOwnedServices())
    }

    const handleSubmit = async () => {
        try {
            setLoading(true)
            setError('')

            if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
                setError('Введите корректную сумму')
                return
            }

            await paymentService.createPayment({
                clientId,
                amount: Number(amount),
                description: description || 'Платеж',
                date: new Date().toISOString(),
                serviceId: selectedService?.id || null
            })

            onPaymentCreated()
            handleClose()
        } catch (err) {
            setError('Ошибка при создании платежа')
            console.error('Error creating payment:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setAmount('')
        setDescription('')
        setError('')
        onClose()
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Добавить платеж</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{mb: 2}}>
                        {error}
                    </Alert>
                )}
                <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 1}}>
                    <TextField
                        label="Сумма"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        fullWidth
                        slotProps={{
                            htmlInput: {
                                min: 0,
                                step: 0.01
                            }
                        }}
                    />
                    <TextField
                        label="Описание"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
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
                                  onChange={(_event, value, _reason) => {
                                      setSelectedService(value)
                                  }}
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

export default PaymentFormModal 