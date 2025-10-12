import api from './api'
import { Client, ClientsResponse, CreateClientData } from '../types/client'

export const clientService = {
  async getClients(page?: number, pageSize?: number): Promise<ClientsResponse> {
    const response = await api.get('/api/clients', {
      params: { page, page_size:pageSize }
    })
    return response.data
  },

  async getClient(id: number): Promise<Client> {
    const response = await api.get(`/api/clients/${id}`)
    return response.data
  },

  async createClient(data: CreateClientData): Promise<number> {
    const response = await api.post('/api/clients', data)
    return response.data.id
  },

  async updateClient(id: number, data: Partial<Client>): Promise<Client> {
    const response = await api.put(`/api/clients/${id}`, data)
    return response.data
  },

  async deleteClient(id: number): Promise<void> {
    await api.delete(`/api/clients/${id}`)
  },

  async getClientsWithDebt() {
    const response = await api.get<Client[]>(`/api/clients/in-debt`)
    return response.data
  }
} 