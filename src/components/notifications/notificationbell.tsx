import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertTriangle, Info, CheckCircle, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/authcontext'
import { useOrganization } from '@/contexts/organizationcontext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  link?: string
  read: boolean
  read_at?: string
  created_at: string
}

export const NotificationBell: React.FC = () => {
  const { user } = useAuth()
  const { organization } = useOrganization()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    loadNotifications()

    // リアルタイム購読
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const loadNotifications = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter(n => !n.read).length)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) throw error

      setNotifications(prev => prev.filter(n => n.id !== id))
      const notification = notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to delete notification:', err)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const getBackgroundColor = (type: string, read: boolean) => {
    const opacity = read ? '50' : '100'
    switch (type) {
      case 'success':
        return `bg-green-${opacity}`
      case 'warning':
        return `bg-yellow-${opacity}`
      case 'error':
        return `bg-red-${opacity}`
      case 'info':
      default:
        return `bg-blue-${opacity}`
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center bg-red-600 text-white text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">通知</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    すべて既読
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  読み込み中...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>通知はありません</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className={`text-sm mt-1 ${
                            !notification.read ? 'text-gray-700' : 'text-gray-500'
                          }`}>
                            {notification.message}
                          </p>
                          {notification.link && (
                            <a
                              href={notification.link}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-2"
                              onClick={() => {
                                if (!notification.read) {
                                  markAsRead(notification.id)
                                }
                                setIsOpen(false)
                              }}
                            >
                              詳細を見る
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ja
                              })}
                            </span>
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                既読にする
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
