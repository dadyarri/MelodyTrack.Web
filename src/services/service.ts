import api from './api'
import { Service, CreateServiceData } from '../types/service'

export const serviceService = {
  getOwnedServices: async () => {
    const response = await api.get<Service[]>('/api/services')
    return response.data
  },

  createService: async (data: CreateServiceData) => {
    const response = await api.post('/api/services', data)
    return response.data
  },

  updateServicePrice: async (serviceId: number, price: number) => {
    const response = await api.patch(`/api/services/${serviceId}/price`, { price })
    return response.data
  }
}