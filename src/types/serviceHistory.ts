import {Client} from './client'
import {Service} from './service'

export interface ServiceHistory {
    id: number
    service: Service
    client: Client
    startDate: string
    endDate: string
    completed: boolean
}

export interface CreateServiceScheduleRequest {
    clientId: number
    serviceId: number
    start: Date
}