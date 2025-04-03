import { Client } from './client'
import { Service } from './service'

export interface ServiceHistory {
  id: number
  service: Service
  client: Client
  startDate: string
  endDate: string
  completed: boolean
}

export interface ServiceHistoryResponse {
  data: ServiceHistory[]
  info: {
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
} 