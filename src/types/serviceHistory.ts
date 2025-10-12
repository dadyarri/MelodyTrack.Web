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

export interface MiniScheduleItem {
    name: string;
    service: string;
    time: Date
}

export interface GetMiniScheduleResponse {
    items: {
        [key: string]: MiniScheduleItem[];
    };
}
