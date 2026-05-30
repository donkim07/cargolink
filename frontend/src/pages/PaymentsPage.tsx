import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CreditCard, Smartphone } from 'lucide-react'
import { paymentsApi } from '@/services'
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
  const [bookingId, setBookingId] = useState('')
  const [phone, setPhone] = useState('+255')
  const [method, setMethod] = useState<PaymentMethod>('mpesa')
  const [result, setResult] = useState<string | null>(null)

  const initiate = useMutation({
    mutationFn: () => paymentsApi.initiate({ booking_id: bookingId, payment_method: method, phone }),
    onSuccess: ({ data }) => setResult(`Payment initiated. Reference: ${data.reference}`),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Payments</h1>
        <p className="text-charcoal/60">Pay for bookings via mobile money</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber" /> Initiate Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Booking ID</Label>
            <Input value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Paste booking UUID" className="mt-1.5" />
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
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              {result}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl border border-forest/10 bg-white p-6">
        <h3 className="font-display font-bold mb-4">Supported Methods</h3>
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <Badge key={m.value} variant="outline">{m.label}</Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
