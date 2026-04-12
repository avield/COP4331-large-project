import { Bell, X } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearNotifications,
} from '@/hooks/useNotifications'
import { useNavigate } from '@tanstack/react-router'

export function NotificationsMenu() {
  const { data: notifications = [], isLoading } = useNotifications(12)
  const { data: unreadCount = 0 } = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const deleteNotification = useDeleteNotification()
  const clearNotifications = useClearNotifications()

  async function handleNotificationClick(notificationId: string, link?: string | null) {
    await markRead.mutateAsync(notificationId)

    if (link) {
        await navigate({ to: link as never })
    }
  }

  async function handleDeleteNotification(
      event: React.MouseEvent<HTMLButtonElement>,
      notificationId: string
    ) {
      event.stopPropagation()
      await deleteNotification.mutateAsync(notificationId)
    }

  async function handleClearAll() {
      await clearNotifications.mutateAsync()
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="font-semibold">Notifications</h3>

            <div className="flex items-center gap-1">
                <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={unreadCount === 0 || markAllRead.isPending}
                >
                Mark all read
                </Button>

                <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={notifications.length === 0 || clearNotifications.isPending}
                >
                Clear all
                </Button>
            </div>
        </div>

        <ul className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notification) => (
                <li
                    key={notification._id}
                    role="button"
                    tabIndex={0}
                    className={`w-full border-b px-4 py-3 text-left hover:bg-accent/50 ${
                        !notification.isRead ? 'bg-accent/20' : ''
                    }`}
                    onClick={() =>
                        handleNotificationClick(notification._id, notification.link)
                    }
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleNotificationClick(notification._id, notification.link)
                        }
                    }}
                    aria-label={`Open notification: ${notification.title}`}
                    >
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="font-medium">{notification.title}</div>
                            <div className="text-sm text-muted-foreground">
                            {notification.message}
                            </div>
                        </div>

                        {!notification.isRead && (
                            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        onClick={(event) => handleDeleteNotification(event, notification._id)}
                        aria-label="Delete notification"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    </div>
                </li>
                ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}