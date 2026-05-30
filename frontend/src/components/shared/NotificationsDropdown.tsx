import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificationsApi } from '@/services'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/utils/cn'

export function NotificationsDropdown() {
  const queryClient = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 30000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = notifications.filter((n) => !n.is_read)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0">
          <Bell className="h-5 w-5 text-charcoal/60" />
          {unread.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-white">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between border-b border-forest/10 px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread.length > 0 && (
            <button
              type="button"
              className="text-xs text-amber hover:underline"
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 && (
          <p className="p-4 text-sm text-charcoal/50">No notifications yet</p>
        )}
        {notifications.slice(0, 10).map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={cn('flex flex-col items-start gap-0.5 p-3 cursor-pointer', !n.is_read && 'bg-amber/5')}
            onClick={() => !n.is_read && markRead.mutate(n.id)}
          >
            <span className="text-sm font-medium">{n.title}</span>
            <span className="text-xs text-charcoal/60 line-clamp-2">{n.message}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
