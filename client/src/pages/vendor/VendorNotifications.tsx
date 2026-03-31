import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Calendar, MessageSquare, Star, AlertCircle, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { motion } from "framer-motion";
import { NotificationsService } from "@/services/NotificationsService";
import type { Notification } from "@/types";
import { useNavigate } from "react-router-dom";

export default function VendorNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await NotificationsService.getApiNotifications({ page: 1, limit: 50 });
                if (!active) return;
                setNotifications(res?.items || []);
            } catch {
                if (!active) return;
                setNotifications([]);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const markAsRead = async (id: string) => {
        setNotifications(notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
        try {
            await NotificationsService.postApiNotificationsRead({ id });
        } catch {
            // ignore
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        const id = String(notification._id);
        if (!notification.isRead) {
            await markAsRead(id);
        }
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const markAllAsRead = async () => {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        try {
            await NotificationsService.postApiNotificationsReadAll();
        } catch {
            // ignore
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "booking":
            case "booking-requested":
            case "booking-accepted":
            case "booking-rejected":
            case "booking-confirmed":
                return Calendar;
            case "message":
                return MessageSquare;
            case "review":
            case "review-received":
                return Star;
            case "payment":
            case "payment-received":
                return DollarSign;
            default:
                return Bell;
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case "booking":
            case "booking-requested":
            case "booking-accepted":
            case "booking-rejected":
            case "booking-confirmed":
                return "bg-primary-soft text-primary";
            case "message":
                return "bg-accent-soft text-accent";
            case "review":
            case "review-received":
                return "bg-warning-soft text-warning";
            case "payment":
            case "payment-received":
                return "bg-success-soft text-success";
            default:
                return "bg-muted text-muted-foreground";
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
        return "Just now";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                    <p className="text-muted-foreground">
                        {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
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
                        const id = String(notification._id);
                        const Icon = getIcon(notification.type);
                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className={`hover-lift cursor-pointer transition-all ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <CardContent className="p-4 flex items-start gap-4">
                                        <div
                                            className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(notification.type)}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-foreground">{notification.title}</p>
                                                {!notification.isRead && (
                                                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {notification.body}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {getTimeAgo(notification.createdAt)}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(id);
                                                }}
                                            >
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
                    {notifications.filter((n) => !n.isRead).length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <CheckCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">No unread notifications</p>
                            </CardContent>
                        </Card>
                    ) : (
                        notifications
                            .filter((n) => !n.isRead)
                            .map((notification, index) => {
                                const Icon = getIcon(notification.type);
                                return (
                                    <motion.div
                                        key={notification._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card
                                            className="hover-lift cursor-pointer border-primary/30 bg-primary/5"
                                            onClick={() => handleNotificationClick(notification)}
                                        >
                                            <CardContent className="p-4 flex items-start gap-4">
                                                <div
                                                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${getIconColor(notification.type)}`}
                                                >
                                                    <Icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-foreground">{notification.title}</p>
                                                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {getTimeAgo(notification.createdAt)}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                    )}
                </TabsContent>

                <TabsContent value="bookings" className="mt-6 space-y-3">
                    {notifications
                        .filter((n) => n.type?.includes("booking"))
                        .map((notification, index) => {
                            const Icon = getIcon(notification.type);
                            return (
                                <motion.div
                                    key={notification._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        className={`hover-lift cursor-pointer ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <div
                                                className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{notification.title}</p>
                                                <p className="text-sm text-muted-foreground">{notification.body}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {getTimeAgo(notification.createdAt)}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                </TabsContent>

                <TabsContent value="messages" className="mt-6 space-y-3">
                    {notifications
                        .filter((n) => n.type?.includes("message"))
                        .map((notification, index) => {
                            const Icon = getIcon(notification.type);
                            return (
                                <motion.div
                                    key={notification._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        className={`hover-lift cursor-pointer ${!notification.isRead ? "border-primary/30 bg-primary/5" : ""}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <CardContent className="p-4 flex items-start gap-4">
                                            <div
                                                className={`h-10 w-10 rounded-full flex items-center justify-center ${getIconColor(notification.type)}`}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-foreground">{notification.title}</p>
                                                <p className="text-sm text-muted-foreground">{notification.body}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {getTimeAgo(notification.createdAt)}
                                                </p>
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
