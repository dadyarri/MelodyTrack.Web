import api from './api'
import {CreatePaymentData, PaymentsResponse} from '../types/payment'

export const paymentService = {
    createPayment: async (data: CreatePaymentData) => {
        const response = await api.post('/payments', data)
        return response.data
    },
    getPayments: async (page?: number, pageSize?: number) => {
        const response = await api.get<PaymentsResponse>('/payments', {
            params: {page, page_size: pageSize}
        })
        return response.data
    },
    deletePayment: async (id: number) => {
        await api.delete(`/payments/${id}`)
    }
} 