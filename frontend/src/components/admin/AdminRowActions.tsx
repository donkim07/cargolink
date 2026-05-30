import { Link } from 'react-router-dom'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminRowActionsProps {
  viewTo?: string
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  deleteLabel?: string
}

export function AdminRowActions({ viewTo, onView, onEdit, onDelete, deleteLabel = 'Delete' }: AdminRowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {viewTo && (
        <Button variant="ghost" size="sm" asChild>
          <Link to={viewTo}><Eye className="h-4 w-4" /></Link>
        </Button>
      )}
      {onView && (
        <Button variant="ghost" size="sm" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> {deleteLabel}
        </Button>
      )}
    </div>
  )
}
