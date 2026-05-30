import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/services'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <p className="text-charcoal/60">All registered platform users</p>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.full_name ?? 'No name'}</p>
                    <p className="text-sm text-charcoal/50">{u.phone}</p>
                    {u.email && <p className="truncate text-xs text-charcoal/40">{u.email}</p>}
                  </div>
                  <Badge variant="secondary" className="capitalize shrink-0">{u.role}</Badge>
                </div>
                <p className="mt-2 text-xs text-charcoal/40">
                  {u.is_verified ? 'Verified' : 'Unverified'} · Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
