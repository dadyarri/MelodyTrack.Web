import api from './api'
import { Expense, ExpensesResponse, CreateExpenseData, CurrentMonthExpensesResponse } from '../types/expense'

export const expenseService = {
  getExpenses: async (page?: number, pageSize?: number) => {
    const response = await api.get<ExpensesResponse>('/expenses', {
      params: { page, page_size: pageSize }
    })
    return response.data
  },

  getCurrentMonthExpenses: async () => {
    const response = await api.get<CurrentMonthExpensesResponse>('/expenses/current-month')
    return response.data
  },

  createExpense: async (data: CreateExpenseData) => {
    const response = await api.post<Expense>('/expenses', data)
    return response.data
  },

  deleteExpense: async (id: number) => {
    await api.delete(`/expenses/${id}`)
  }
} 