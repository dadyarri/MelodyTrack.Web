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
  }
}