import api from './api'
import { LoginRequest, RegisterRequest, LoginResponse, User } from '../types/auth'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user'

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    this.setToken(response.data.accessToken)
    this.setUser({
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      username: credentials.username,
    })
    return response.data
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data)
    this.setToken(response.data.accessToken)
    this.setUser({
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      username: data.username,
    })
    return response.data
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
  },

  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },

  isAuthenticated(): boolean {
    const token = this.getToken()
    if (!token) return false

    const user = this.getUser()
    return !!user
  },
} 