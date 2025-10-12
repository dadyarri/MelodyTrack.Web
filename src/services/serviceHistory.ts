import api from './api'
import {CreateServiceScheduleRequest, ServiceHistory} from '../types/serviceHistory'

export const scheduleService = {
  getSchedule: async (startDate: string, endDate: string, timezone: string): Promise<ServiceHistory[]> => {
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    params.append('timezone', timezone)
    
    const response = await api.get<ServiceHistory[]>(`/api/schedule?${params.toString()}`)
    return response.data
  },

  createServiceSchedule: async (data: CreateServiceScheduleRequest): Promise<number> => {
    const response = await api.post(`/api/schedule`, data)
    return response.data.id;
  },

  toggleServiceScheduleCompletion: async (id: number) => {
    await api.patch(`/api/schedule/${id}/completion`)
  }
} 