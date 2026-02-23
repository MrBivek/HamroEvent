import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    Send,
    Calendar,
    MapPin,
    Clock,
    User,
    Package,
    Check,
    X,
    RefreshCw,
    DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { motion, AnimatePresence } from "framer-motion";
import { VendorBookingsService } from "@/services/VendorBookingsService";
import { ConversationsService } from "@/services/ConversationsService";
import type { Booking } from "@/types";

export default function VendorBookingDetail() {
    const { id } = useParams();
    const { toast } = useToast();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    const [status, setStatus] = useState("pending");
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleReason, setRescheduleReason] = useState("");
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id) return;
            try {
                const res = await VendorBookingsService.getApiVendorsMeBookings1({ id });
                if (!active) return;
                setBooking(res || null);
                setStatus(res?.status || "pending");
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

    const handleSendMessage = async () => {
        if (!message.trim() || !id) return;
        try {
            const convo = await ConversationsService.postApiConversations({
                requestBody: { bookingId: id }
            });
            const msg = await ConversationsService.postApiConversationsMessages({
                id: convo._id,
                requestBody: { text: message }
            });
            setMessages([...messages, msg]);
            setMessage("");
        } catch (error: any) {
            toast({
                title: "Failed to send message",
                description: error?.body?.message || "Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleAccept = async () => {
        if (!id) return;
        try {
            const res = await VendorBookingsService.patchApiVendorsMeBookingsDecision({
                id,
                requestBody: { decision: "ACCEPT" }
            });
            setStatus(res?.status || "accepted");
            toast({ title: "Booking Accepted", description: "The customer has been notified." });
        } catch (error: any) {
            toast({
                title: "Failed to accept booking",
                description: error?.body?.message || "Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleReject = async () => {
        if (!id) return;
        try {
            const res = await VendorBookingsService.patchApiVendorsMeBookingsDecision({
                id,
                requestBody: { decision: "REJECT" }
            });
            setStatus(res?.status || "rejected");
            toast({ title: "Booking Rejected", description: "The customer has been notified." });
        } catch (error: any) {
            toast({
                title: "Failed to reject booking",
                description: error?.body?.message || "Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleReschedule = () => {
        if (!rescheduleDate) return;
        toast({ title: "Reschedule not available", description: "This feature will be added soon." });
    };

    const getStatusColor = (s: string) => {
        switch (s) {
            case "confirmed":
                return "success";
            case "accepted":
                return "soft-secondary";
            case "pending":
                return "warning";
            case "rejected":
            case "cancelled":
                return "destructive";
            case "completed":
                return "success";
            default:
                return "outline";
        }
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
                    <Link to="/vendor/bookings">Back to Bookings</Link>
                </Button>
            </div>
        );
    }

    const bookingAny = booking as any;
    const customer = booking.customer || bookingAny.customer || {};
    const timeRange = bookingAny.timeRange || { start: "--", end: "--" };
    const packageName = bookingAny.packageName || bookingAny.packageTitle || "Package";
    const price = bookingAny.price || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/vendor/bookings">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground">Booking Details</h1>
                    <p className="text-muted-foreground">Booking #{id}</p>
                </div>
                <Badge variant={getStatusColor(status) as any} className="capitalize text-sm px-3 py-1">
                    {status.replace("_", " ")}
                </Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Booking Info */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Customer Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Customer</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-primary/10 text-primary">
                                        {String(customer.name || "?")
                                            .split(" ")
                                            .map((part: string) => part[0])
                                            .join("")
                                            .slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-foreground">{customer.name || "Customer"}</p>
                                    <p className="text-sm text-muted-foreground">{customer.email || ""}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{customer.phone || ""}</p>
                        </CardContent>
                    </Card>

                    {/* Event Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.eventType}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {new Date(booking.date).toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {timeRange.start} - {timeRange.end}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{bookingAny.location || booking.location || ""}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-3 text-sm">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{packageName}</span>
                            </div>
                            <ul className="pl-7 text-sm text-muted-foreground space-y-1">
                                {(bookingAny.packageInclusions || []).map((inc: string, i: number) => (
                                    <li key={i}>• {inc}</li>
                                ))}
                            </ul>
                            <div className="flex items-center gap-3 text-sm pt-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg font-bold text-foreground">
                                    NPR {price.toLocaleString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Notes */}
                    {bookingAny.notes && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Customer Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{bookingAny.notes}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Action Buttons */}
                    {status === "pending" && (
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <Button variant="success" className="w-full" onClick={handleAccept}>
                                    <Check className="h-4 w-4 mr-2" /> Accept Booking
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full">
                                            <RefreshCw className="h-4 w-4 mr-2" /> Propose Reschedule
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Propose New Date</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <Input
                                                type="date"
                                                value={rescheduleDate}
                                                onChange={(e) => setRescheduleDate(e.target.value)}
                                            />
                                            <Textarea
                                                placeholder="Reason for reschedule..."
                                                value={rescheduleReason}
                                                onChange={(e) => setRescheduleReason(e.target.value)}
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button onClick={handleReschedule}>Send Proposal</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="destructive" className="w-full" onClick={handleReject}>
                                    <X className="h-4 w-4 mr-2" /> Decline
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Chat */}
                <Card className="lg:col-span-2 flex flex-col h-[600px]">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="text-base">Messages</CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            <AnimatePresence>
                                {messages.map((msg, index) => {
                                    const sender = msg.sender || msg.senderRole || msg.senderId;
                                    return (
                                        <motion.div
                                            key={msg._id || msg.id || index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`flex ${sender === "vendor" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                                                    sender === "vendor"
                                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                                        : "bg-muted text-foreground rounded-bl-md"
                                                }`}
                                            >
                                                <p className="text-sm">{msg.text}</p>
                                                <p
                                                    className={`text-xs mt-1 ${sender === "vendor" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                                                >
                                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    </ScrollArea>
                    <div className="border-t border-border p-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type your message..."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                className="flex-1"
                            />
                            <Button onClick={handleSendMessage} disabled={!message.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
