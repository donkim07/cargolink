import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTZS(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount
  return `TZS ${value.toLocaleString('en-TZ', { maximumFractionDigits: 0 })}`
}

export function formatPhone(phone: string): string {
  if (phone.startsWith('+255')) return phone
  if (phone.startsWith('0')) return `+255${phone.slice(1)}`
  return phone
}
