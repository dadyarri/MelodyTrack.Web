import React, {useEffect, useState} from 'react'
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
} from '@mui/material'
import {Service} from "../types/service.ts";
import {serviceService} from "../services/service.ts";
import {clientService} from "../services/client.ts";
import {Client} from "../types/client.ts";
import {paymentService} from "../services/payment.ts";
import {CreatePaymentData} from "../types/payment.ts";

interface PaymentFormModalProps {
    open: boolean
    onClose: () => void
    onPaymentCreated: () => void
}

const PaymentFormModal = ({open, onClose, onPaymentCreated}: PaymentFormModalProps) => {
    const [description, setDescription] = useState('')
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string>('')
    const [services, setServices] = useState<Service[]>([])
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)

    useEffect(() => {
        fetchData()
    }, []);

    const fetchData = async () => {
        setServices(await serviceService.getOwnedServices())
        setClients((await clientService.getClients(1, 100)).data)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount.trim()) {
            setError('Пожалуйста, заполните сумму платежа')
            return
        }

        if (!selectedClient) {
            setError('Выберите клиента')
            return
        }

        const amountValue = parseFloat(amount)
        if (isNaN(amountValue) || amountValue <= 0) {
            setError('Сумма должна быть положительным числом')
            return
        }

        try {
            setLoading(true)
            setError('')

            const paymentData: CreatePaymentData = {
                description: description.trim(),
                amount: amountValue,
                serviceId: selectedService?.id || null,
                clientId: selectedClient.id
            }

            await paymentService.createPayment(paymentData)
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
        setDescription('')
        setAmount('')
        setError('')
        onClose()
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Добавить платёж</DialogTitle>
                <DialogContent>
                    <Box sx={{display: 'flex', flexDirection: 'column', gap: 2, mt: 1}}>
                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                        <Autocomplete renderInput={(params) => <TextField {...params} label={"Клиент"}/>}
                                      options={clients}
                                      renderOption={(props, option) => {
                                          const {key, ...optionProps} = props;
                                          return (<Box key={key} component={"li"} {...optionProps}>
                                              {option.firstName} {option.lastName}
                                          </Box>)
                                      }}
                                      getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                                      onChange={(_event, value, _reason) => {
                                          setSelectedClient(value)
                                      }}
                        />
                        <TextField
                            label="Сумма"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            fullWidth
                            error={!!error}
                            slotProps={{
                                htmlInput: {
                                    step: '0.01',
                                    min: '0'
                                }
                            }}
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
                        <TextField
                            label="Описание"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            fullWidth
                            error={!!error}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Отмена</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={loading}
                    >
                        {loading ? 'Создание...' : 'Создать'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    )
}

export default PaymentFormModal