import { supabase } from '@/integrations/supabase/client'

export interface ExpenseInput {
  amount: number
  category: string
  date: string
  description?: string
}

export async function fetchExpenses(userId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id as number,
    amount: Number(row.amount),
    category: row.category as string,
    date: row.date as string,
    description: row.description || ''
  }))
}

export async function createExpense(userId: string, expense: ExpenseInput) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: userId,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      description: expense.description
    })
    .select()
    .single()
  if (error) throw error
  return {
    id: data!.id as number,
    amount: Number(data!.amount),
    category: data!.category as string,
    date: data!.date as string,
    description: data!.description || ''
  }
}

export async function updateExpense(
  userId: string,
  id: number,
  updates: Partial<ExpenseInput>
) {
  const { error } = await supabase
    .from('expenses')
    .update({
      amount: updates.amount,
      category: updates.category,
      date: updates.date,
      description: updates.description
    })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteExpense(userId: string, id: number) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
