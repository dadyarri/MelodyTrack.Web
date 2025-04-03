import api from './api'
import { CreatePaymentData } from '../types/payment'

export const paymentService = {
  createPayment: async (data: CreatePaymentData) => {
    const response = await api.post('/api/payments', data)
    return response.data
  }
} 