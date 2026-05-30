import { useRef, useState, useEffect } from 'react'
import { cn } from '@/utils/cn'

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function OTPInput({ length = 6, value, onChange, disabled }: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))

  useEffect(() => {
    if (value.length === 0) setDigits(Array(length).fill(''))
    else setDigits(value.split('').concat(Array(length).fill('')).slice(0, length))
  }, [value, length])

  const update = (newDigits: string[]) => {
    setDigits(newDigits)
    onChange(newDigits.join(''))
  }

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return
    const next = [...digits]
    next[index] = char
    update(next)
    if (char && index < length - 1) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    update(pasted.split('').concat(Array(length).fill('')).slice(0, length))
    inputsRef.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-11 rounded-lg border-2 border-forest/15 bg-white text-center text-lg font-bold text-charcoal',
            'focus:border-amber focus:ring-2 focus:ring-amber/30 focus:outline-none transition-all',
            digit && 'border-amber/50'
          )}
        />
      ))}
    </div>
  )
}
