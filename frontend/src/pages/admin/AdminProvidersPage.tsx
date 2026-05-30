import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Shield } from 'lucide-react'
import { adminApi } from '@/services'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminProvidersPage() {
  const queryClient = useQueryClient()

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => adminApi.listProviders().then((r) => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-providers'] }),
  })

  const pending = providers.filter((p) => !p.is_approved)
  const approved = providers.filter((p) => p.is_approved)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Provider Management</h1>
        <p className="text-charcoal/60">Approve providers and manage the marketplace</p>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display font-bold text-amber">Pending Approval ({pending.length})</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {pending.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between gap-4 p-4">
                      <div>
                        <p className="font-medium">{p.company_name}</p>
                        <p className="text-sm text-charcoal/50">{p.user_phone}</p>
                      </div>
                      <Button size="sm" onClick={() => approve.mutate(p.id)} disabled={approve.isPending}>
                        <CheckCircle className="h-4 w-4" /> Approve
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="font-display font-bold">Approved Providers ({approved.length})</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {approved.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{p.company_name}</p>
                        <p className="text-sm text-charcoal/50">{p.user_phone}</p>
                      </div>
                      <Badge variant="secondary" className="bg-forest/10 text-forest">
                        <Shield className="mr-1 h-3 w-3" /> Approved
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-charcoal/50">{p.total_deliveries} deliveries · ★ {p.rating}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
