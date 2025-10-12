export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  patronymic?: string;
  contacts?: ClientContact;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientContact {
  id: number;
  vk?: string;
  telegram?: string;
  phone?: string;
}

export interface CreateClientData {
  firstName: string;
  lastName: string;
  phone?: string;
  patronymic?: string;
  vk?: string;
  telegram?: string;
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