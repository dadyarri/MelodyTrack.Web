export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  contacts: {
    phone?: string;
    vk?: string;
    telegram?: string;
  }
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  firstName: string;
  lastName: string;
  contacts: {
    phone?: string;
    vk?: string;
    telegram?: string;
  }
}

export interface ClientsResponse {
  data: Client[];
  info: {
    total: number;
    page: number;
    pageSize: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  vk?: string;
  telegram?: string;
  phone?: string;
}