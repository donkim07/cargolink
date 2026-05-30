import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { providersApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

export default function ProviderRegisterPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [companyName, setCompanyName] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [description, setDescription] = useState('')

  const register = useMutation({
    mutationFn: () =>
      providersApi.register({
        company_name: companyName,
        registration_number: registrationNumber || undefined,
        description: description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-me'] })
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] })
      navigate('/fleet')
    },
  })

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Register as Provider</h1>
        <p className="text-charcoal/60">Set up your transport company profile</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Registration Number</Label>
            <Input
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="TZ-XXXXX"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Services, coverage areas..."
              className="mt-1.5"
            />
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!companyName || register.isPending}
            onClick={() => register.mutate()}
          >
            {register.isPending ? 'Registering...' : 'Register Provider Profile'}
          </Button>
          {register.isError && (
            <p className="text-sm text-red-600">Registration failed. You may already have a profile.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
