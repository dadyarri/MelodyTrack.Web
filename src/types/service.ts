export interface Service {
    id: number
    name: string
    description: string
    currentPrice: number
  }
  
  export interface CreateServiceData {
    name: string
    description: string
    price: number
  }