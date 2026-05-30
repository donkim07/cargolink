import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Camera, User as UserIcon } from 'lucide-react'
import { authApi } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo ?? null)
  const [photoData, setPhotoData] = useState<string | null | undefined>(undefined)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setFullName(user.full_name ?? '')
    setEmail(user.email ?? '')
    setPhotoPreview(user.profile_photo ?? null)
  }, [user])

  const save = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        full_name: fullName.trim() || undefined,
        email: email.trim() || undefined,
        ...(photoData !== undefined ? { profile_photo: photoData } : {}),
      }),
    onSuccess: async () => {
      await refreshUser()
      setPhotoData(undefined)
      setMessage('Profile updated successfully')
      setError(null)
    },
    onError: (err: Error & { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail ?? 'Could not update profile')
      setMessage(null)
    },
  })

  const handlePhoto = (file: File | undefined) => {
    if (!file) return
    if (file.size > 400_000) {
      setError('Image must be under 400KB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPhotoPreview(result)
      setPhotoData(result)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="text-charcoal/60">Edit your account details and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-forest/10 bg-forest/5"
              onClick={() => fileRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-8 w-8 text-charcoal/30" />
              )}
              <span className="absolute bottom-0 right-0 rounded-full bg-amber p-1 text-white">
                <Camera className="h-3 w-3" />
              </span>
            </button>
            <div className="text-sm text-charcoal/60">
              <p className="font-medium text-charcoal">Profile photo</p>
              <p>Click to upload JPG or PNG (max 400KB)</p>
              {photoPreview && (
                <button
                  type="button"
                  className="mt-1 text-xs text-red-600 hover:underline"
                  onClick={() => {
                    setPhotoPreview(null)
                    setPhotoData(null)
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handlePhoto(e.target.files?.[0])}
            />
          </div>

          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1.5" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={user.phone} disabled className="mt-1.5 bg-canvas/50" />
          </div>
          <div className="flex items-center gap-2">
            <Label>Role</Label>
            <Badge variant="secondary" className="capitalize">{user.role}</Badge>
          </div>

          {message && <p className="text-sm text-emerald-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Language</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-charcoal/60">
            Translate the app with Google Translate. The language control stays in English so it always works.
          </p>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card className="border-forest/10 bg-forest/5">
        <CardContent className="space-y-2 p-4 text-sm text-charcoal/70">
          <p className="font-medium text-charcoal">How roles work</p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>Customer</strong> — book and track shipments, pay, auctions, shared cargo.</li>
            <li><strong>Provider</strong> — transport company; manages fleet and drivers.</li>
            <li><strong>Driver</strong> — staff of a provider; accepts one delivery at a time.</li>
            <li><strong>Admin</strong> — approves providers and assigns shipments.</li>
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
