import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="text-charcoal/60">Account details and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Name</span>
            <span className="font-medium">{user.full_name ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Phone</span>
            <span className="font-medium">{user.phone}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Email</span>
            <span className="font-medium">{user.email ?? '—'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Role</span>
            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-charcoal/60">
            Translate the entire app using Google Translate. English is the default source language.
          </p>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card className="border-forest/10 bg-forest/5">
        <CardContent className="space-y-2 p-4 text-sm text-charcoal/70">
          <p className="font-medium text-charcoal">How roles work</p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>Customer</strong> — book and track shipments, pay, auctions, shared cargo.</li>
            <li><strong>Provider</strong> — transport company; manages fleet and drivers; receives marketplace bookings.</li>
            <li><strong>Driver</strong> — employee of a provider; accepts one delivery at a time from their company.</li>
            <li><strong>Admin</strong> — approves providers and can assign provider + driver when needed.</li>
          </ul>
          {user.role === 'provider' && (
            <Button asChild className="mt-2" variant="outline" size="sm">
              <Link to="/fleet">Manage fleet & drivers →</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
