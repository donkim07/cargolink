import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCircle, Shield } from 'lucide-react'
import { adminApi } from '@/services'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { AdminRowActions } from '@/components/admin/AdminRowActions'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminProvider } from '@/types'

export default function AdminProvidersPage() {
  const queryClient = useQueryClient()
  const [editProvider, setEditProvider] = useState<AdminProvider | null>(null)
  const [viewProvider, setViewProvider] = useState<AdminProvider | null>(null)
  const [companyName, setCompanyName] = useState('')

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => adminApi.listProviders().then((r) => r.data),
  })

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-providers'] }),
  })

  const updateProvider = useMutation({
    mutationFn: () => adminApi.updateProvider(editProvider!.id, { company_name: companyName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-providers'] })
      setEditProvider(null)
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => adminApi.deleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-providers'] }),
  })

  const columns: ColumnDef<AdminProvider>[] = [
    { id: 'company', header: 'Company', cell: ({ row }) => row.original.company_name },
    { id: 'phone', header: 'Phone', cell: ({ row }) => row.original.user_phone ?? '—' },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_approved ? 'success' : 'warning'}>
          {row.original.is_approved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    { id: 'rating', header: 'Rating', cell: ({ row }) => row.original.rating },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          {!row.original.is_approved && (
            <Button size="sm" onClick={() => approve.mutate(row.original.id)}>
              <CheckCircle className="h-4 w-4" /> Approve
            </Button>
          )}
          <AdminRowActions
            onView={() => setViewProvider(row.original)}
            onEdit={() => {
              setEditProvider(row.original)
              setCompanyName(row.original.company_name)
            }}
            onDelete={() => {
              if (confirm(`Revoke ${row.original.company_name}?`)) revoke.mutate(row.original.id)
            }}
            deleteLabel=""
          />
        </div>
      ),
    },
  ]

  return (
    <AdminPageShell title="Providers" description="Approve, edit, and revoke transport providers">
      {isLoading ? <p>Loading...</p> : <DataTable columns={columns} data={providers} />}

      <Dialog open={!!viewProvider} onOpenChange={(o) => !o && setViewProvider(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Provider Details</DialogTitle></DialogHeader>
          {viewProvider && (
            <dl className="space-y-3 text-sm">
              <div><dt className="text-charcoal/50">Company</dt><dd className="font-medium">{viewProvider.company_name}</dd></div>
              <div><dt className="text-charcoal/50">Phone</dt><dd className="font-medium">{viewProvider.user_phone ?? '—'}</dd></div>
              <div><dt className="text-charcoal/50">Status</dt><dd>{viewProvider.is_approved ? 'Approved' : 'Pending approval'}</dd></div>
              <div><dt className="text-charcoal/50">Rating</dt><dd>{viewProvider.rating}</dd></div>
            </dl>
          )}
          <Button variant="outline" className="w-full" onClick={() => { if (viewProvider) { setEditProvider(viewProvider); setCompanyName(viewProvider.company_name); setViewProvider(null) } }}>
            Edit Provider
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editProvider} onOpenChange={(o) => !o && setEditProvider(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Provider</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company Name</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1.5" />
            </div>
            {editProvider?.is_approved && (
              <p className="flex items-center gap-2 text-sm text-forest">
                <Shield className="h-4 w-4" /> Approved provider
              </p>
            )}
            <Button className="w-full" onClick={() => updateProvider.mutate()} disabled={updateProvider.isPending}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
