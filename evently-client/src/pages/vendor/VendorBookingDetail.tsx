import { useCallback, useEffect, useMemo, useState } from "react";
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
    DollarSign,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
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
import { VendorPaymentsService } from "@/services/VendorPaymentsService";
import { PaymentsService } from "@/services/PaymentsService";
import { ConversationsService } from "@/services/ConversationsService";
import { QuotesService } from "@/services/QuotesService";
import { getErrorMessage } from "@/lib/api";
import { getSocket } from "@/lib/socket.ts";
import { useAuthStore } from "@/store/authStore.ts";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type {
    Booking,
    BookingHistoryEntry,
    BookingMessage,
    BookingStatus,
    ConversationMessage,
    Quote,
    VendorPaymentRecord,
    Refund
} from "@/types";

type ChatMessage = BookingMessage | ConversationMessage;

export default function VendorBookingDetail() {
    const { id } = useParams();
    const { toast } = useToast();
    const { token } = useAuthStore();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState("pending");
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleReason, setRescheduleReason] = useState("");
    const [refundPayment, setRefundPayment] = useState<VendorPaymentRecord | null>(null);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [refundProvider, setRefundProvider] = useState("KHALTI");
    const [isRefunding, setIsRefunding] = useState(false);
    const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [quoteMessage, setQuoteMessage] = useState("");
    const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
    const [customInclusions, setCustomInclusions] = useState<string[]>([]);
    const [customInclusionInput, setCustomInclusionInput] = useState("");
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [isQuoteSaving, setIsQuoteSaving] = useState(false);
    const [proposalEntry, setProposalEntry] = useState<BookingHistoryEntry | null>(null);
    const [paymentRecords, setPaymentRecords] = useState<VendorPaymentRecord[]>([]);
    const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [isRefundsLoading, setIsRefundsLoading] = useState(false);

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

    useEffect(() => {
        let active = true;
        const loadConversation = async () => {
            if (!id) return;
            try {
                const convo = await ConversationsService.postApiConversations({
                    requestBody: { bookingId: id }
                });
                if (!active) return;
                setConversationId(convo._id);
            } catch {
                if (!active) return;
                setConversationId(null);
            }
        };
        loadConversation();
        return () => {
            active = false;
        };
    }, [id]);

    const messageKey = useMemo(
        () => (msg: ChatMessage) => {
            if ("_id" in msg) return `conversation:${msg._id}`;
            return `booking:${msg.id}`;
        },
        []
    );

    const appendMessage = useCallback(
        (incoming: ChatMessage) => {
            setMessages((prev) => {
                const incomingKey = messageKey(incoming);
                if (prev.some((m) => messageKey(m) === incomingKey)) return prev;
                return [...prev, incoming].sort(
                    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
            });
        },
        [messageKey]
    );

    const syncQuoteForm = useCallback((incoming: Quote | null) => {
        if (!incoming) return;
        setQuoteAmount(incoming.amount ? String(incoming.amount) : "");
        setQuoteMessage(incoming.message || "");
        setSelectedInclusions(incoming.packageInclusions || []);
        setCustomInclusions(incoming.customInclusions || []);
    }, []);

    useEffect(() => {
        let active = true;
        const loadQuote = async () => {
            if (!id) return;
            setIsQuoteLoading(true);
            try {
                const res = (await QuotesService.getApiQuotesBooking({ id })) as Quote | null;
                if (!active) return;
                setQuote(res || null);
                if (res) syncQuoteForm(res);
            } catch {
                if (!active) return;
                setQuote(null);
            } finally {
                if (active) setIsQuoteLoading(false);
            }
        };
        loadQuote();
        return () => {
            active = false;
        };
    }, [id, syncQuoteForm]);

    useEffect(() => {
        let active = true;
        const loadPayments = async () => {
            if (!id) return;
            setIsPaymentsLoading(true);
            try {
                const res = await VendorPaymentsService.getApiVendorsMePayments({ bookingId: id, page: 1, limit: 20 });
                if (!active) return;
                setPaymentRecords(res?.items || []);
            } catch {
                if (!active) return;
                setPaymentRecords([]);
            } finally {
                if (active) setIsPaymentsLoading(false);
            }
        };
        loadPayments();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        const loadRefunds = async () => {
            if (!id) return;
            setIsRefundsLoading(true);
            try {
                const res = await PaymentsService.getApiRefunds({ bookingId: id, page: 1, limit: 20 });
                if (!active) return;
                setRefunds(res?.items || []);
            } catch {
                if (!active) return;
                setRefunds([]);
            } finally {
                if (active) setIsRefundsLoading(false);
            }
        };
        loadRefunds();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        if (!quote && booking?.packageInclusions?.length && selectedInclusions.length === 0) {
            setSelectedInclusions(booking.packageInclusions);
        }
    }, [booking, quote, selectedInclusions.length]);

    useEffect(() => {
        if (!conversationId || !token) return;
        const socket = getSocket(token);
        if (!socket) return;

        const handleMessage = (incoming: ConversationMessage) => {
            if (incoming.conversationId !== conversationId) return;
            appendMessage(incoming);
        };

        socket.emit("conversation:join", { conversationId });
        socket.on("message:new", handleMessage);

        return () => {
            socket.emit("conversation:leave", { conversationId });
            socket.off("message:new", handleMessage);
        };
    }, [appendMessage, conversationId, token]);

    useEffect(() => {
        if (!token) return;
        const socket = getSocket(token);
        if (!socket) return;

        const handleQuoteUpdate = (incoming: Quote) => {
            if (!incoming || incoming.bookingId !== id) return;
            setQuote(incoming);
            syncQuoteForm(incoming);
            if (incoming.bookingStatus) {
                setBooking((prev) => (prev ? { ...prev, status: incoming.bookingStatus } : prev));
                setStatus(incoming.bookingStatus);
            }
        };

        socket.on("quote:update", handleQuoteUpdate);
        return () => {
            socket.off("quote:update", handleQuoteUpdate);
        };
    }, [id, syncQuoteForm, token]);

    useEffect(() => {
        if (!token) return;
        const socket = getSocket(token);
        if (!socket) return;

        const handleBookingUpdate = (incoming: {
            bookingId?: string;
            bookingStatus?: BookingStatus;
            history?: BookingHistoryEntry[];
        }) => {
            if (!incoming || incoming.bookingId !== id) return;
            if (incoming.bookingStatus) {
                setBooking((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: incoming.bookingStatus,
                              history: incoming.history ?? prev.history
                          }
                        : prev
                );
                setStatus(incoming.bookingStatus);
            }
        };

        socket.on("booking:update", handleBookingUpdate);
        return () => {
            socket.off("booking:update", handleBookingUpdate);
        };
    }, [id, token]);

    const handleSendMessage = async () => {
        if (isChatDisabled || !message.trim() || !id) return;
        try {
            const convoId =
                conversationId ||
                (
                    await ConversationsService.postApiConversations({
                        requestBody: { bookingId: id }
                    })
                )._id;
            if (!conversationId) setConversationId(convoId);
            const msg = await ConversationsService.postApiConversationsMessages({
                id: convoId,
                requestBody: { text: message }
            });
            appendMessage(msg);
            setMessage("");
        } catch (error) {
            toast({
                title: "Failed to send message",
                description: getErrorMessage(error, "Please try again."),
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
        } catch (error) {
            toast({
                title: "Failed to accept booking",
                description: getErrorMessage(error, "Please try again."),
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
        } catch (error) {
            toast({
                title: "Failed to reject booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleComplete = async () => {
        if (!id) return;
        setIsCompleting(true);
        try {
            const res = await VendorBookingsService.patchApiVendorsMeBookingsComplete({ id });
            setBooking(res as Booking);
            setStatus((res as Booking).status || status);
            toast({ title: "Event completed", description: "Customer can now review." });
        } catch (error) {
            toast({
                title: "Failed to complete booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsCompleting(false);
        }
    };

    const handleRefundInitiate = async () => {
        if (!refundPayment || !id) return;
        const amount = Number(refundAmount || refundPayment.amount);
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            toast({ title: "Enter a valid amount", variant: "destructive" });
            return;
        }
        if (amount > refundPayment.amount) {
            toast({ title: "Amount exceeds payment", variant: "destructive" });
            return;
        }
        if (amount > totalPaid) {
            toast({ title: "Amount exceeds total paid", variant: "destructive" });
            return;
        }
        setIsRefunding(true);
        try {
            const res = await PaymentsService.postApiRefundsInitiate({
                requestBody: {
                    paymentId: refundPayment.id,
                    amount,
                    provider: refundProvider,
                    reason: refundReason || undefined
                }
            });
            if (res?.refundId) {
                setPendingRefundId(res.refundId);
            }
            if (res?.formData && res?.payUrl) {
                const form = document.createElement("form");
                form.method = "POST";
                form.action = res.payUrl;
                Object.entries(res.formData as Record<string, string>).forEach(([key, value]) => {
                    const input = document.createElement("input");
                    input.type = "hidden";
                    input.name = key;
                    input.value = String(value);
                    form.appendChild(input);
                });
                document.body.appendChild(form);
                form.submit();
                form.remove();
            } else if (res?.payUrl) {
                window.open(res.payUrl, "_blank");
            }
            toast({ title: "Refund initiated", description: "Complete the payment in the new window." });
        } catch (error) {
            toast({
                title: "Failed to initiate refund",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsRefunding(false);
        }
    };

    const handleRefundConfirm = async () => {
        if (!pendingRefundId || !id) return;
        setIsRefunding(true);
        try {
            await PaymentsService.postApiRefundsConfirm({ id: pendingRefundId });
            const paymentRes = await VendorPaymentsService.getApiVendorsMePayments({
                bookingId: id,
                page: 1,
                limit: 20
            });
            setPaymentRecords(paymentRes?.items || []);
            const refundRes = await PaymentsService.getApiRefunds({ bookingId: id, page: 1, limit: 20 });
            setRefunds(refundRes?.items || []);
            const bookingRes = await VendorBookingsService.getApiVendorsMeBookings1({ id });
            setBooking(bookingRes as Booking);
            setStatus((bookingRes as Booking).status || status);
            setRefundPayment(null);
            setRefundAmount("");
            setRefundReason("");
            setPendingRefundId(null);
            toast({ title: "Refund confirmed", description: "The booking was cancelled." });
        } catch (error) {
            toast({
                title: "Failed to confirm refund",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsRefunding(false);
        }
    };

    const handleReschedule = () => {
        if (!rescheduleDate) return;
        toast({ title: "Reschedule not available", description: "This feature will be added soon." });
    };

    const eventEnd = useMemo(() => {
        if (!booking?.date) return null;
        const date = new Date(booking.date);
        const endTime = booking.timeRange?.end;
        if (endTime && /^\d{2}:\d{2}$/.test(endTime)) {
            const [h, m] = endTime.split(":").map(Number);
            const end = new Date(date);
            end.setHours(h, m, 0, 0);
            return end;
        }
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return end;
    }, [booking?.date, booking?.timeRange?.end]);

    const getStatusColor = (s: string): BadgeProps["variant"] => {
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

    const getStatusIcon = (value: string) => {
        switch (value) {
            case "confirmed":
            case "completed":
            case "accepted":
                return <CheckCircle2 className="h-4 w-4 text-success" />;
            case "payment":
                return <DollarSign className="h-4 w-4 text-secondary" />;
            case "pending":
                return <AlertCircle className="h-4 w-4 text-warning" />;
            case "proposal":
                return <FileText className="h-4 w-4 text-primary" />;
            case "rejected":
            case "cancelled":
                return <XCircle className="h-4 w-4 text-destructive" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const formatHistoryStatus = (value: string) => {
        if (value === "proposal") return "Proposal";
        if (value === "payment") return "Payment";
        return value.replace(/-/g, " ");
    };

    const formatMessageDay = (value: string) => {
        const date = new Date(value);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((today.getTime() - messageDay.getTime()) / 86400000);
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        const sameYear = messageDay.getFullYear() === now.getFullYear();
        const options: Intl.DateTimeFormatOptions = {
            month: "short",
            day: "numeric",
            ...(sameYear ? {} : { year: "numeric" })
        };
        return messageDay.toLocaleDateString("en-US", options);
    };

    const groupedMessages = useMemo(() => {
        const groups: Array<{ label: string; items: ChatMessage[] }> = [];
        const map = new Map<string, ChatMessage[]>();
        for (const msg of messages) {
            const label = formatMessageDay(msg.createdAt);
            let bucket = map.get(label);
            if (!bucket) {
                bucket = [];
                map.set(label, bucket);
                groups.push({ label, items: bucket });
            }
            bucket.push(msg);
        }
        return groups;
    }, [messages]);

    const isChatDisabled = status === "cancelled" || status === "rejected";
    const isBookingInactive = status === "cancelled" || status === "rejected";
    const isQuoteLocked = Boolean(isBookingInactive || status !== "pending");

    const quoteStatusBanner = useMemo(() => {
        if (!quote) return null;
        if (quote.status === "rejected") return "Proposal rejected";
        return "Proposal saved. Update anytime.";
    }, [quote]);

    const handleToggleInclusion = (item: string) => {
        setSelectedInclusions((prev) =>
            prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]
        );
    };

    const handleAddCustomInclusion = () => {
        const trimmed = customInclusionInput.trim();
        if (!trimmed) return;
        setCustomInclusions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
        setCustomInclusionInput("");
    };

    const handleRemoveCustomInclusion = (item: string) => {
        setCustomInclusions((prev) => prev.filter((entry) => entry !== item));
    };

    const handleSubmitQuote = async () => {
        if (!booking) return;
        const amount = Number(quoteAmount);
        if (!amount || Number.isNaN(amount)) {
            toast({
                title: "Enter a valid price",
                description: "Please provide the proposed price before sending.",
                variant: "destructive"
            });
            return;
        }
        const pendingCustom = customInclusionInput.trim();
        const mergedCustom = pendingCustom
            ? Array.from(new Set([...customInclusions, pendingCustom]))
            : customInclusions;
        setIsQuoteSaving(true);
        try {
            const res = (
                quote
                    ? await QuotesService.patchApiVendorsMeQuotes({
                          id: quote._id,
                          requestBody: {
                              amount,
                              message: quoteMessage || undefined,
                              packageInclusions: selectedInclusions,
                              customInclusions: mergedCustom
                          }
                      })
                    : await QuotesService.postApiVendorsMeBookingsQuote({
                          id: booking._id,
                          requestBody: {
                              amount,
                              message: quoteMessage || undefined,
                              packageInclusions: selectedInclusions,
                              customInclusions: mergedCustom
                          }
                      })
            ) as Quote;
            setQuote(res);
            syncQuoteForm(res);
            if (res?.bookingStatus) {
                setBooking((prev) => (prev ? { ...prev, status: res.bookingStatus } : prev));
                setStatus(res.bookingStatus);
            }
            setCustomInclusionInput("");
            setCustomInclusions(mergedCustom);
            toast({ title: "Quote sent", description: "Customer will review your proposal." });
        } catch (error) {
            toast({
                title: "Failed to send quote",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsQuoteSaving(false);
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

    const customer = booking.customer;
    const timeRange = booking.timeRange || { start: "--", end: "--" };
    const packageName = booking.packageName || "Package";
    const price = quote?.amount ?? booking.price ?? 0;
    const packageInclusions = booking.packageInclusions || [];
    const history = booking.history || [];
    const canAcceptBooking = status === "pending" && Boolean(quote);
    const eligibleForComplete = ["accepted", "confirmed"].includes(status);
    const totalPaid = paymentRecords
        .filter((payment) => String(payment.status).toUpperCase() === "PAID")
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const canComplete =
        eligibleForComplete && eventEnd && new Date().getTime() >= eventEnd.getTime();

    const getMessageSender = (msg: ChatMessage) => {
        if ("sender" in msg) return msg.sender;
        return msg.senderId === booking.customerId ? "customer" : "vendor";
    };

    const getMessageId = (msg: ChatMessage, index: number) => {
        if ("id" in msg) return msg.id;
        if ("_id" in msg) return msg._id;
        return String(index);
    };

    return (
        <div className="space-y-6">
            <Dialog
                open={Boolean(refundPayment)}
                onOpenChange={(open) => {
                    if (!open) {
                        setRefundPayment(null);
                        setPendingRefundId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Issue Refund</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (NPR)</label>
                            <Input
                                type="number"
                                min={1}
                                value={refundAmount}
                                onChange={(e) => setRefundAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Provider</label>
                            <Select value={refundProvider} onValueChange={setRefundProvider}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="KHALTI">Khalti</SelectItem>
                                    <SelectItem value="ESEWA">eSewa</SelectItem>
                                    <SelectItem value="MOCK">Mock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Reason (optional)</label>
                            <Textarea
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="Reason for refund"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRefundPayment(null)}
                            disabled={isRefunding}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleRefundInitiate} disabled={isRefunding}>
                            {isRefunding ? "Processing..." : "Initiate Refund"}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleRefundConfirm}
                            disabled={!pendingRefundId || isRefunding}
                        >
                            Confirm Refund
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                <Badge variant={getStatusColor(status)} className="capitalize text-sm px-3 py-1">
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
                                        {String(customer?.name || "?")
                                            .split(" ")
                                            .map((part: string) => part[0])
                                            .join("")
                                            .slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-foreground">{customer?.name || "Customer"}</p>
                                    <p className="text-sm text-muted-foreground">{customer?.email || ""}</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{customer?.phone || ""}</p>
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
                                <span>{booking.location || ""}</span>
                            </div>
                            <Separator />
                            <div className="flex items-center gap-3 text-sm">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{packageName}</span>
                            </div>
                            <ul className="pl-7 text-sm text-muted-foreground space-y-1">
                                {packageInclusions.map((inc: string, i: number) => (
                                    <li key={i}>• {inc}</li>
                                ))}
                            </ul>
                            <div className="flex items-center gap-3 text-sm pt-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <span className="text-lg font-bold text-foreground">NPR {price.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Notes */}
                    {booking.notes && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Customer Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{booking.notes}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Payments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isPaymentsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading payments...</p>
                            ) : paymentRecords.length > 0 ? (
                                paymentRecords.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">
                                                NPR {payment.amount.toLocaleString()}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {payment.provider} •{" "}
                                                {new Date(
                                                    payment.paidAt || payment.createdAt || ""
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={
                                                    String(payment.status).toUpperCase() === "PAID"
                                                        ? "success"
                                                        : "warning"
                                                }
                                                className="capitalize"
                                            >
                                                {String(payment.status).toLowerCase()}
                                            </Badge>
                                            {String(payment.status).toUpperCase() === "PAID" && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setRefundPayment(payment);
                                                        setRefundAmount(String(payment.amount));
                                                        setRefundReason("");
                                                        setRefundProvider("KHALTI");
                                                        setPendingRefundId(null);
                                                    }}
                                                >
                                                    Refund
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No payments yet.</p>
                            )}

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">Refund History</p>
                                {isRefundsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading refunds...</p>
                                ) : refunds.length > 0 ? (
                                    refunds.map((refund) => (
                                        <div
                                            key={refund._id}
                                            className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                                        >
                                            <div>
                                                <p className="font-medium text-foreground">
                                                    NPR {refund.amount.toLocaleString()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {refund.provider || "Provider"} •{" "}
                                                    {new Date(
                                                        refund.confirmedAt || refund.createdAt || ""
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={
                                                    String(refund.status).toUpperCase() === "PAID"
                                                        ? "success"
                                                        : "warning"
                                                }
                                                className="capitalize"
                                            >
                                                {String(refund.status || "initiated").toLowerCase()}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No refunds yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    {status === "pending" && (
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <Button
                                    variant="success"
                                    className="w-full"
                                    onClick={handleAccept}
                                    disabled={!canAcceptBooking}
                                >
                                    <Check className="h-4 w-4 mr-2" /> Accept Booking
                                </Button>
                                {!quote && (
                                    <p className="text-xs text-muted-foreground">
                                        Send a proposal first to enable acceptance.
                                    </p>
                                )}
                                <Dialog>
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

                    {eligibleForComplete && (
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <Button
                                    variant="default"
                                    className="w-full"
                                    onClick={handleComplete}
                                    disabled={!canComplete || isCompleting}
                                >
                                    {isCompleting ? "Completing..." : "Mark as Completed"}
                                </Button>
                                {!canComplete && (
                                    <p className="text-xs text-muted-foreground">
                                        You can mark this as completed after the event ends.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Booking Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.map((entry, i) => {
                                    const isProposal = entry.status === "proposal";
                                    return (
                                        <div
                                            key={i}
                                            className={`flex gap-3 ${isProposal ? "cursor-pointer" : ""}`}
                                            onClick={() => {
                                                if (isProposal) setProposalEntry(entry);
                                            }}
                                        >
                                            <div className="flex flex-col items-center">
                                                {getStatusIcon(entry.status)}
                                                {i < history.length - 1 && (
                                                    <div className="w-px flex-1 bg-border mt-2" />
                                                )}
                                            </div>
                                            <div className="pb-4">
                                                <p className="font-medium text-foreground capitalize">
                                                    {formatHistoryStatus(entry.status)}
                                                </p>
                                                {entry.note && (
                                                    <p className="text-sm text-muted-foreground">{entry.note}</p>
                                                )}
                                                {isProposal && (
                                                    <p className="text-xs text-primary mt-1">View proposal details</p>
                                                )}
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
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Chat */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-base">Quote & Requirements</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Review customer needs and finalize pricing.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {quote && <Badge variant="soft">Proposal active</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {quoteStatusBanner && (
                                <div className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                                    {quoteStatusBanner}
                                </div>
                            )}
                            {isQuoteLoading ? (
                                <p className="text-sm text-muted-foreground">Loading quote...</p>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Proposed Price</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={quoteAmount}
                                                onChange={(e) => setQuoteAmount(e.target.value)}
                                                disabled={isQuoteLocked || quote?.status === "accepted"}
                                                placeholder="Enter price"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Notes</label>
                                            <Textarea
                                                value={quoteMessage}
                                                onChange={(e) => setQuoteMessage(e.target.value)}
                                                placeholder="Add details or preferences..."
                                                disabled={isQuoteLocked || quote?.status === "accepted"}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <p className="text-sm font-medium">Package inclusions</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {(booking.packageInclusions || []).map((item) => (
                                                <label key={item} className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={selectedInclusions.includes(item)}
                                                        onCheckedChange={() => handleToggleInclusion(item)}
                                                        disabled={isQuoteLocked || quote?.status === "accepted"}
                                                    />
                                                    <span>{item}</span>
                                                </label>
                                            ))}
                                            {!booking.packageInclusions?.length && (
                                                <p className="text-sm text-muted-foreground">
                                                    No package inclusions available.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <p className="text-sm font-medium">Custom inclusions</p>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <Input
                                                value={customInclusionInput}
                                                onChange={(e) => setCustomInclusionInput(e.target.value)}
                                                placeholder="Add extra requirement"
                                                disabled={isQuoteLocked || quote?.status === "accepted"}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddCustomInclusion}
                                                disabled={isQuoteLocked || quote?.status === "accepted"}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {customInclusions.map((item) => (
                                                <span
                                                    key={item}
                                                    className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
                                                >
                                                    {item}
                                                    {!isQuoteLocked && quote?.status !== "accepted" && (
                                                        <button
                                                            type="button"
                                                            className="text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleRemoveCustomInclusion(item)}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            type="button"
                                            onClick={handleSubmitQuote}
                                            disabled={isQuoteSaving || isQuoteLocked || quote?.status === "accepted"}
                                        >
                                            {quote ? "Update proposal" : "Send proposal"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col h-[600px]">
                        <CardHeader className="border-b border-border pb-4">
                            <CardTitle className="text-base">Messages</CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-6">
                                <AnimatePresence>
                                    {groupedMessages.map((group) => (
                                        <div key={group.label} className="space-y-3">
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="h-px flex-1 bg-border" />
                                                <span className="rounded-full bg-muted px-3 py-1">{group.label}</span>
                                                <span className="h-px flex-1 bg-border" />
                                            </div>
                                            {group.items.map((msg, index) => {
                                                const sender = getMessageSender(msg);
                                                return (
                                                    <motion.div
                                                        key={getMessageId(msg, index)}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className={`flex ${
                                                            sender === "vendor" ? "justify-end" : "justify-start"
                                                        }`}
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
                                                                className={`text-xs mt-1 ${
                                                                    sender === "vendor"
                                                                        ? "text-primary-foreground/70"
                                                                        : "text-muted-foreground"
                                                                }`}
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
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                        <div className="border-t border-border p-4">
                            {isChatDisabled && (
                                <p className="text-xs text-muted-foreground mb-3">
                                    Messaging is disabled for cancelled or rejected bookings.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Type your message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    className="flex-1"
                                    disabled={isChatDisabled}
                                />
                                <Button onClick={handleSendMessage} disabled={isChatDisabled || !message.trim()}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <Dialog open={Boolean(proposalEntry)} onOpenChange={(open) => !open && setProposalEntry(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Proposal Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Updated by</span>
                            <span className="font-medium capitalize">
                                {proposalEntry?.meta?.updatedBy || proposalEntry?.byRole}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-semibold text-foreground">
                                NPR {proposalEntry?.meta?.amount?.toLocaleString() ?? "—"}
                            </span>
                        </div>
                        {proposalEntry?.meta?.message && (
                            <div>
                                <p className="text-muted-foreground mb-1">Message</p>
                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                    {proposalEntry.meta.message}
                                </div>
                            </div>
                        )}
                        <div>
                            <p className="text-muted-foreground mb-1">Package inclusions</p>
                            <div className="flex flex-wrap gap-2">
                                {(proposalEntry?.meta?.packageInclusions || []).length > 0 ? (
                                    proposalEntry?.meta?.packageInclusions?.map((item) => (
                                        <Badge key={item} variant="outline">
                                            {item}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <p className="text-muted-foreground mb-1">Custom inclusions</p>
                            <div className="flex flex-wrap gap-2">
                                {(proposalEntry?.meta?.customInclusions || []).length > 0 ? (
                                    proposalEntry?.meta?.customInclusions?.map((item) => (
                                        <Badge key={item} variant="soft">
                                            {item}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
