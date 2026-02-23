import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Clock,
    Send,
    Phone,
    Mail,
    CheckCircle2,
    XCircle,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { BookingsService } from "@/services/BookingsService";
import { ConversationsService } from "@/services/ConversationsService";
import { resolveMediaUrl } from "@/lib/api";
import type { Booking } from "@/types";

export default function CustomerBookingDetail() {
    const { id } = useParams();
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id) return;
            try {
                const res = await BookingsService.getApiBookings1({ id });
                if (!active) return;
                setBooking(res || null);
                setMessages(res?.messages || []);
            } catch {
                if (!active) return;
                setBooking(null);
                setMessages([]);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [id]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "confirmed":
            case "completed":
            case "accepted":
                return <CheckCircle2 className="h-4 w-4 text-success" />;
            case "pending":
                return <AlertCircle className="h-4 w-4 text-warning" />;
            case "rejected":
            case "cancelled":
                return <XCircle className="h-4 w-4 text-destructive" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "confirmed":
                return "success";
            case "accepted":
                return "soft-secondary";
            case "pending":
                return "warning";
            case "completed":
                return "default";
            default:
                return "outline";
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !id) return;

        try {
            const convo = await ConversationsService.postApiConversations({
                requestBody: { bookingId: id }
            });
            const message = await ConversationsService.postApiConversationsMessages({
                id: convo._id,
                requestBody: { text: newMessage }
            });
            setMessages([...messages, message]);
            setNewMessage("");
            toast({ title: "Message sent" });
        } catch (error: any) {
            toast({
                title: "Failed to send message",
                description: error?.body?.message || "Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleCancel = () => {
        toast({ title: "Cancellation requested", description: "The vendor will be notified." });
    };

    if (isLoading) {
        return (
            <div className="container py-16 text-center">
                <p className="text-muted-foreground">Loading booking...</p>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Booking not found</h1>
                <Button asChild>
                    <Link to="/customer/bookings">Back to Bookings</Link>
                </Button>
            </div>
        );
    }

    const bookingAny = booking as any;
    const vendorName = bookingAny.vendorName || booking.vendor?.businessName || "Vendor";
    const vendorImage = bookingAny.vendorImage || booking.vendor?.portfolioMedia?.[0];
    const category = bookingAny.category || booking.vendor?.category || "Service";
    const packageName = bookingAny.packageName || bookingAny.packageTitle || booking.packageId || "Package";
    const price = bookingAny.price || 0;
    const timeRange = bookingAny.timeRange || { start: "--", end: "--" };
    const location = bookingAny.location || booking.location || "";
    const vendorPhone = bookingAny.vendorPhone || booking.vendor?.contact?.phone || "";
    const vendorEmail = bookingAny.vendorEmail || booking.vendor?.contact?.email || "";
    const history = bookingAny.history || [];

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to="/customer/bookings"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Bookings
            </Link>

            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                    {/* Booking Info */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <img
                                    src={resolveMediaUrl(vendorImage)}
                                    alt={vendorName}
                                    className="w-24 h-24 rounded-lg object-cover"
                                />
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <h1 className="text-xl font-bold text-foreground">{vendorName}</h1>
                                            <p className="text-muted-foreground">
                                                {category} • {packageName}
                                            </p>
                                        </div>
                                        <Badge variant={getStatusVariant(booking.status) as any} className="capitalize">
                                            {booking.status}
                                        </Badge>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {new Date(booking.date).toLocaleDateString("en-US", {
                                                    weekday: "long",
                                                    month: "long",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            <span>
                                                {timeRange.start} - {timeRange.end}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <MapPin className="h-4 w-4" />
                                            <span>{location}</span>
                                        </div>
                                        <div className="font-semibold text-foreground">
                                            NPR {price.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {bookingAny.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Notes: </span>
                                        {bookingAny.notes}
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`tel:${vendorPhone}`}>
                                        <Phone className="h-4 w-4 mr-1" />
                                        Call
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={`mailto:${vendorEmail}`}>
                                        <Mail className="h-4 w-4 mr-1" />
                                        Email
                                    </a>
                                </Button>
                                {booking.status !== "completed" && booking.status !== "cancelled" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCancel}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        Cancel Booking
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Messages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                                {messages.map((msg, index) => {
                                    const sender = msg.senderRole || msg.sender;
                                    return (
                                        <div
                                            key={msg._id || msg.id || index}
                                            className={`flex ${sender === "customer" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-xl px-4 py-2 ${
                                                    sender === "customer"
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted text-foreground"
                                                }`}
                                            >
                                                <p className="text-sm">{msg.text}</p>
                                                <p
                                                    className={`text-xs mt-1 ${
                                                        sender === "customer"
                                                            ? "text-primary-foreground/70"
                                                            : "text-muted-foreground"
                                                    }`}
                                                >
                                                    {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                                        hour: "numeric",
                                                        minute: "2-digit"
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline */}
                <div className="lg:w-80">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Booking Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.map((entry: any, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            {getStatusIcon(entry.status)}
                                            {i < history.length - 1 && (
                                                <div className="w-px flex-1 bg-border mt-2" />
                                            )}
                                        </div>
                                        <div className="pb-4">
                                            <p className="font-medium text-foreground capitalize">{entry.status}</p>
                                            <p className="text-sm text-muted-foreground">{entry.note}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(entry.at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "numeric",
                                                    minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
