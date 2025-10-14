import api from './api'
import {CreateServiceScheduleRequest, GetMiniScheduleResponse, ServiceHistory} from '../types/serviceHistory'

export const scheduleService = {
  getSchedule: async (startDate: string, endDate: string, timezone: string): Promise<ServiceHistory[]> => {
    const params = new URLSearchParams()
    params.append('startDate', startDate)
    params.append('endDate', endDate)
    params.append('timezone', timezone)
    
    const response = await api.get<ServiceHistory[]>(`/schedule?${params.toString()}`)
    return response.data
  },

  createServiceSchedule: async (data: CreateServiceScheduleRequest): Promise<number> => {
    const response = await api.post(`/schedule`, data)
    return response.data.id;
  },

  toggleServiceScheduleCompletion: async (id: number) => {
    await api.patch(`/schedule/${id}/completion`)
  },

  getMiniSchedule: async (timezone: string) => {
    const params = new URLSearchParams()
    params.append('timezone', timezone)
    const response = await api.get<GetMiniScheduleResponse>(`/schedule/mini?${params.toString()}`);
    return response.data;
  }
} 