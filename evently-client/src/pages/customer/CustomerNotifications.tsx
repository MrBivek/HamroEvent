import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCheck, Calendar, MessageSquare, BadgeCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { NotificationsService } from "@/services/NotificationsService";
import type { Notification } from "@/types";

export default function CustomerNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            case "booking-confirmed":
                return <BadgeCheck className="h-5 w-5 text-success" />;
            case "booking-accepted":
                return <Check className="h-5 w-5 text-secondary" />;
            case "message":
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
                        {unreadCount > 0
                            ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                            : "All caught up!"}
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
                            {notifications.map((notification, index) => {
                                const id = String(notification._id);
                                return (
                                    <motion.button
                                        key={id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => markAsRead(id)}
                                        className={`w-full flex items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50 ${
                                            !notification.isRead ? "bg-primary-soft/30" : ""
                                        }`}
                                    >
                                        <div className="shrink-0 mt-1">{getIcon(notification.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-foreground">
                                                    {notification.title}
                                                </span>
                                                {!notification.isRead && (
                                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {notification.body}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(notification.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </motion.button>
                                );
                            })}
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
