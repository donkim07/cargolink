import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Truck, MapPin, ArrowRight } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { authApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { useResendCooldown } from '@/hooks/useResendCooldown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OTPInput } from '@/components/shared/OTPInput'
import { formatPhone } from '@/utils/cn'

export default function LoginPage() {
  const { login } = useAuth()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('+255')
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
    mutationFn: () => authApi.sendOtp(formatPhone(phone), 'login'),
    onSuccess: ({ data }) => handleOtpSent(data.resend_available_in ?? 60),
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 429) {
        const match = String(err.response.data?.detail ?? '').match(/(\d+) seconds/)
        if (match) startCooldown(parseInt(match[1], 10))
      }
      setError(isAxiosError(err) ? String(err.response?.data?.detail ?? 'Failed to send OTP.') : 'Failed to send OTP.')
    },
  })

  const resendOtp = useMutation({
    mutationFn: () => authApi.resendOtp(formatPhone(phone), 'login'),
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
    mutationFn: () => authApi.verifyOtp({ phone: formatPhone(phone), code: otp, purpose: 'login' }),
    onSuccess: ({ data }) => login(data.access_token, data.refresh_token, data.user),
    onError: () => setError('Invalid OTP. Please try again.'),
  })

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-forest">
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 800 800" className="h-full w-full">
            <path d="M50,400 Q200,200 400,350 T750,300" fill="none" stroke="#E87C2A" strokeWidth="3" strokeDasharray="8 4" />
            <circle cx="50" cy="400" r="8" fill="#E87C2A" />
            <circle cx="750" cy="300" r="8" fill="#E87C2A" />
          </svg>
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber">
              <Truck className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-display text-4xl font-bold text-canvas leading-tight">
              Move cargo across<br />
              <span className="text-amber">Africa</span> with confidence
            </h1>
            <p className="mt-4 max-w-md text-canvas/70 text-lg">
              Digital freight marketplace built for SMS, USSD, and mobile money. From Dar to Dodoma — one platform.
            </p>
            <div className="mt-8 flex items-center gap-6 text-canvas/60 text-sm">
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber" /> 500+ routes</span>
              <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-amber" /> Verified providers</span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-canvas p-8">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-charcoal">Welcome back</h2>
            <p className="mt-1 text-charcoal/60">Sign in with your phone number</p>
          </div>

          {step === 'phone' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+255712345678"
                  className="mt-1.5"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" size="lg" onClick={() => sendOtp.mutate()} disabled={sendOtp.isPending}>
                {sendOtp.isPending ? 'Sending...' : 'Send OTP'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-charcoal/60">
                Enter the code sent to <strong>{phone}</strong>
                <span className="block text-xs mt-1 text-charcoal/40">
                  Sandbox: check the Africa&apos;s Talking SMS simulator dashboard
                </span>
              </p>
              <OTPInput value={otp} onChange={setOtp} disabled={verifyOtp.isPending} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" size="lg" onClick={() => verifyOtp.mutate()} disabled={otp.length < 4 || verifyOtp.isPending}>
                {verifyOtp.isPending ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={!canResend || resendOtp.isPending}
                onClick={() => resendOtp.mutate()}
              >
                {resendOtp.isPending
                  ? 'Resending...'
                  : canResend
                    ? 'Resend OTP'
                    : `Resend OTP in ${secondsLeft}s`}
              </Button>
              <button onClick={() => setStep('phone')} className="w-full text-sm text-charcoal/50 hover:text-amber">
                Change phone number
              </button>
            </div>
          )}

          <p className="text-center text-sm text-charcoal/50">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-semibold text-amber hover:underline">Register</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
