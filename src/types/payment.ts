import {Service} from "./service.ts";
import {Client} from "./client.ts";

export interface Payment {
    id: number
    description: string,
    client: Client,
    service: Service
    amount: number
    date: string
}

export interface CreatePaymentData {
    clientId: number
    amount: number
    description: string
    serviceId: number | null
}

export interface PaymentsResponse {
    data: Payment[]
    info: {
        total: number
        page: number
        pageSize: number
    }
}