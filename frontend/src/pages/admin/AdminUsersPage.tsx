import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { adminApi } from '@/services'
import { AdminPageShell } from '@/components/admin/AdminPageShell'
import { AdminRowActions } from '@/components/admin/AdminRowActions'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { AdminUser, UserRole } from '@/types'

export default function AdminUsersPage() {
  const queryClient = useQueryClient()
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [viewUser, setViewUser] = useState<AdminUser | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('customer')
  const [isActive, setIsActive] = useState(true)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const updateUser = useMutation({
    mutationFn: () =>
      adminApi.updateUser(editUser!.id, {
        full_name: fullName,
        email: email || undefined,
        role,
        is_active: isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditUser(null)
    },
  })

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const openEdit = (user: AdminUser) => {
    setEditUser(user)
    setFullName(user.full_name ?? '')
    setEmail(user.email ?? '')
    setRole(user.role)
    setIsActive(user.is_active)
  }

  const columns: ColumnDef<AdminUser>[] = [
    { id: 'name', header: 'Name', cell: ({ row }) => row.original.full_name ?? '—' },
    { id: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone },
    { id: 'email', header: 'Email', cell: ({ row }) => row.original.email ?? '—' },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.role}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'destructive'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <AdminRowActions
          onView={() => setViewUser(row.original)}
          onEdit={() => openEdit(row.original)}
          onDelete={() => {
            if (confirm(`Deactivate ${row.original.phone}?`)) deleteUser.mutate(row.original.id)
          }}
          deleteLabel=""
        />
      ),
    },
  ]

  return (
    <AdminPageShell title="Users" description="View, edit, and deactivate platform users">
      {isLoading ? <p>Loading...</p> : <DataTable columns={columns} data={users} minWidth="720px" />}

      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
          {viewUser && (
            <dl className="space-y-3 text-sm">
              <div><dt className="text-charcoal/50">Name</dt><dd className="font-medium">{viewUser.full_name ?? '—'}</dd></div>
              <div><dt className="text-charcoal/50">Phone</dt><dd className="font-medium">{viewUser.phone}</dd></div>
              <div><dt className="text-charcoal/50">Email</dt><dd className="font-medium">{viewUser.email ?? '—'}</dd></div>
              <div><dt className="text-charcoal/50">Role</dt><dd className="capitalize">{viewUser.role}</dd></div>
              <div><dt className="text-charcoal/50">Status</dt><dd>{viewUser.is_active ? 'Active' : 'Inactive'}</dd></div>
            </dl>
          )}
          <Button variant="outline" className="w-full" onClick={() => { if (viewUser) { openEdit(viewUser); setViewUser(null) } }}>
            Edit User
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} id="active" />
              <Label htmlFor="active">Active account</Label>
            </div>
            <Button className="w-full" onClick={() => updateUser.mutate()} disabled={updateUser.isPending}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
