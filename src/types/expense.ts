export interface Expense {
    id: number
    description: string
    amount: number
    date: string
}

export interface CreateExpenseData {
    description: string
    amount: number,
}

export interface ExpensesResponse {
    data: Expense[]
    info: {
        total: number
        page: number
        pageSize: number
    }
}

export interface CurrentMonthExpensesResponse {
    totalAmount: number
    count: number
    expenses: Expense[]
} 