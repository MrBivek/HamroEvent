import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Calendar, MessageSquare, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';

const mockNotifications = [
  {
    id: '1',
    type: 'booking-confirmed',
    title: 'Booking Confirmed',
    body: 'Your booking with Himalayan Moments Photography has been confirmed for Feb 15, 2025.',
    link: '/customer/bookings/1',
    isRead: false,
    createdAt: '2025-01-07T09:00:00Z',
  },
  {
    id: '2',
    type: 'booking-accepted',
    title: 'Booking Accepted',
    body: 'Grand Banquet Hall has accepted your booking request.',
    link: '/customer/bookings/2',
    isRead: false,
    createdAt: '2025-01-06T14:00:00Z',
  },
  {
    id: '3',
    type: 'message',
    title: 'New Message',
    body: 'You have a new message from Spice Route Catering.',
    link: '/customer/bookings/3',
    isRead: true,
    createdAt: '2025-01-05T16:00:00Z',
  },
  {
    id: '4',
    type: 'booking-requested',
    title: 'Booking Pending',
    body: 'Your booking request to Dream Decorators is pending review.',
    link: '/customer/bookings/4',
    isRead: true,
    createdAt: '2025-01-04T10:00:00Z',
  },
];

export default function CustomerNotifications() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking-confirmed':
        return <BadgeCheck className="h-5 w-5 text-success" />;
      case 'booking-accepted':
        return <Check className="h-5 w-5 text-secondary" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-primary" />;
      default:
        return <Calendar className="h-5 w-5 text-warning" />;
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Notifications */}
      <Card>
        <CardContent className="p-0">
          {notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification, index) => (
                <motion.button
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => markAsRead(notification.id)}
                  className={`w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                    !notification.isRead ? 'bg-primary-soft/30' : ''
                  }`}
                >
                  <div className="shrink-0 mt-1">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-foreground">{notification.title}</span>
                      {!notification.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No notifications</h3>
              <p className="text-muted-foreground">You're all caught up!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
