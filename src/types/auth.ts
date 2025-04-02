export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

export interface LoginResponse {
  firstName: string;
  lastName: string;
  accessToken: string;
  expireAt: string;
}

export interface User {
  firstName: string;
  lastName: string;
  username: string;
} 