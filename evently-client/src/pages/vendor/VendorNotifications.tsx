import { useState } from 'react';
import { Bell, Check, CheckCheck, Calendar, MessageSquare, Star, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { motion } from 'framer-motion';

const mockNotifications = [
  { id: '1', type: 'booking', title: 'New Booking Request', body: 'Sita Sharma requested a booking for February 15, 2025', link: '/vendor/bookings/1', isRead: false, createdAt: '2025-01-20T10:00:00Z' },
  { id: '2', type: 'message', title: 'New Message', body: 'Ram Thapa sent you a message about their event', link: '/vendor/bookings/2', isRead: false, createdAt: '2025-01-19T15:30:00Z' },
  { id: '3', type: 'review', title: 'New Review', body: 'Maya Gurung left you a 5-star review!', link: '/vendor/profile', isRead: true, createdAt: '2025-01-18T09:00:00Z' },
  { id: '4', type: 'payment', title: 'Payment Received', body: 'You received NPR 75,000 for Wedding Photography', link: '/vendor/payments', isRead: true, createdAt: '2025-01-17T12:00:00Z' },
  { id: '5', type: 'system', title: 'Profile Verified', body: 'Congratulations! Your vendor profile has been verified.', link: '/vendor/profile', isRead: true, createdAt: '2025-01-15T10:00:00Z' },
];

export default function VendorNotifications() {
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'message': return MessageSquare;
      case 'review': return Star;
      case 'payment': return DollarSign;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-primary-soft text-primary';
      case 'message': return 'bg-accent-soft text-accent';
      case 'review': return 'bg-warning-soft text-warning';
      case 'payment': return 'bg-success-soft text-success';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" /> Mark all as read
          </Button>
        )}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-3">
          {notifications.map((notification, index) => {
            const Icon = getIcon(notification.type);
            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`hover-lift cursor-pointer transition-all ${!notification.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
                    </div>
                    {!notification.isRead && (
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="unread" className="mt-6 space-y-3">
          {notifications.filter(n => !n.isRead).length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No unread notifications</p>
              </CardContent>
            </Card>
          ) : (
            notifications.filter(n => !n.isRead).map((notification, index) => {
              const Icon = getIcon(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover-lift cursor-pointer border-primary/30 bg-primary/5" onClick={() => markAsRead(notification.id)}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(notification.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6 space-y-3">
          {notifications.filter(n => n.type === 'booking').map((notification, index) => {
            const Icon = getIcon(notification.type);
            return (
              <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className={`hover-lift cursor-pointer ${!notification.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="messages" className="mt-6 space-y-3">
          {notifications.filter(n => n.type === 'message').map((notification, index) => {
            const Icon = getIcon(notification.type);
            return (
              <motion.div key={notification.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className={`hover-lift cursor-pointer ${!notification.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{getTimeAgo(notification.createdAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
