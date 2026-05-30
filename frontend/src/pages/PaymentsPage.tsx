import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CreditCard, Smartphone } from 'lucide-react'
import { paymentsApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { PaymentMethod } from '@/types'

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'tigo_pesa', label: 'Tigo Pesa' },
  { value: 'halopesa', label: 'HaloPesa' },
]

export default function PaymentsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [bookingId, setBookingId] = useState('')
  const [phone, setPhone] = useState(user?.phone ?? '+255')
  const [method, setMethod] = useState<PaymentMethod>('mpesa')
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    const fromUrl = searchParams.get('bookingId')
    if (fromUrl) setBookingId(fromUrl)
  }, [searchParams])

  const initiate = useMutation({
    mutationFn: () => paymentsApi.initiate({ booking_id: bookingId, payment_method: method, phone }),
    onSuccess: ({ data }) => setResult(`Payment initiated. Reference: ${data.reference}`),
  })

  const isCustomer = user?.role === 'customer' || user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{isCustomer ? 'Payments' : 'Earnings'}</h1>
        <p className="text-charcoal/60">
          {isCustomer ? 'Pay for confirmed bookings via mobile money' : 'Payment records for your completed jobs'}
        </p>
      </div>

      {isCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-amber" /> Pay for Booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-charcoal/60">
              Open a shipment detail page and click Pay Now — the booking ID fills in automatically.
            </p>
            <div>
              <Label>Booking ID</Label>
              <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="From shipment detail page" className="mt-1.5" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {methods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" />{m.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => initiate.mutate()} disabled={!bookingId || initiate.isPending}>
              {initiate.isPending ? 'Processing...' : 'Pay Now'}
            </Button>
            {result && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-forest/10 bg-white p-6">
        <h3 className="mb-4 font-display font-bold">Supported Methods</h3>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <Badge key={m.value} variant="outline">{m.label}</Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
