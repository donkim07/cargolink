import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { authApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useResendCooldown } from '@/hooks/useResendCooldown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OTPInput } from '@/components/shared/OTPInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatPhone } from '@/utils/cn'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const { login } = useAuth()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [phone, setPhone] = useState('+255')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const { secondsLeft, canResend, startCooldown } = useResendCooldown()

  const handleOtpSent = (resendIn = 60) => {
    setStep('otp')
    setError('')
    setOtp('')
    startCooldown(resendIn)
  }

  const sendOtp = useMutation({
    mutationFn: () => authApi.sendOtp(formatPhone(phone), 'registration'),
    onSuccess: ({ data }) => handleOtpSent(data.resend_available_in ?? 60),
    onError: (err) => setError(isAxiosError(err) ? String(err.response?.data?.detail ?? 'Failed to send OTP.') : 'Failed to send OTP.'),
  })

  const resendOtp = useMutation({
    mutationFn: () => authApi.resendOtp(formatPhone(phone), 'registration'),
    onSuccess: ({ data }) => {
      setError('')
      setOtp('')
      startCooldown(data.resend_available_in ?? 60)
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 429) {
        const match = String(err.response.data?.detail ?? '').match(/(\d+) seconds/)
        if (match) startCooldown(parseInt(match[1], 10))
      }
      setError(isAxiosError(err) ? String(err.response?.data?.detail ?? 'Could not resend OTP.') : 'Could not resend OTP.')
    },
  })

  const verifyOtp = useMutation({
    mutationFn: () =>
      authApi.verifyOtp({
        phone: formatPhone(phone),
        code: otp,
        purpose: 'registration',
        full_name: fullName,
        email: email || undefined,
        role,
      }),
    onSuccess: ({ data }) => login(data.access_token, data.refresh_token, data.user),
    onError: () => setError('Invalid OTP.'),
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6 rounded-2xl border border-forest/10 bg-white p-8 shadow-card">
        <div>
          <h2 className="font-display text-2xl font-bold">Create account</h2>
          <p className="mt-1 text-charcoal/60">Join CargoLink Africa</p>
        </div>

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="mt-1.5" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+255712345678" className="mt-1.5" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" className="mt-1.5" />
            </div>
            <div>
              <Label>I am a</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer (Ship cargo)</SelectItem>
                  <SelectItem value="provider">Transport Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" size="lg" onClick={() => sendOtp.mutate()} disabled={!fullName || sendOtp.isPending}>
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-charcoal/60">Code sent to <strong>{phone}</strong></p>
            <OTPInput value={otp} onChange={setOtp} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" size="lg" onClick={() => verifyOtp.mutate()} disabled={otp.length < 4}>
              Verify & Create Account
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              disabled={!canResend || resendOtp.isPending}
              onClick={() => resendOtp.mutate()}
            >
              {resendOtp.isPending ? 'Resending...' : canResend ? 'Resend OTP' : `Resend OTP in ${secondsLeft}s`}
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-charcoal/50">
          Already have an account? <Link to="/login" className="font-semibold text-amber hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
