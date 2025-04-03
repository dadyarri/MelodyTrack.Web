import api from './api'
import { ServiceHistory, ServiceHistoryResponse } from '../types/serviceHistory'

export const scheduleService = {
  getSchedule: async (startDate: string, endDate: string): Promise<ServiceHistoryResponse> => {
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    
    const response = await api.get<ServiceHistoryResponse>(`/api/schedule?${params.toString()}`)
    return response.data
  }
} 