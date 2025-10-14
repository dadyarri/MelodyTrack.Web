import axios from 'axios'
import { authService } from './auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://mt.dadyarri.ru/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      authService.logout()
    }
    return Promise.reject(error)
  }
)

export default api 