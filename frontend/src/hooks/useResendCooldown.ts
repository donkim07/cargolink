import { useEffect, useState } from 'react'

export function useResendCooldown(initialSeconds = 0) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  const startCooldown = (seconds: number) => setSecondsLeft(seconds)

  return { secondsLeft, canResend: secondsLeft === 0, startCooldown }
}
