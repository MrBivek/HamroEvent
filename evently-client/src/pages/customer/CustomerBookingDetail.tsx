import { useCallback, useEffect, useMemo, useState } from "react";
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
    AlertCircle,
    FileText,
    DollarSign
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { BookingsService } from "@/services/BookingsService";
import { PaymentsService } from "@/services/PaymentsService";
import { ConversationsService } from "@/services/ConversationsService";
import { QuotesService } from "@/services/QuotesService";
import { ReviewsService } from "@/services/ReviewsService";
import { ReportsService } from "@/services/ReportsService";
import { getErrorMessage, resolveMediaUrl } from "@/lib/api";
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
    Review,
    Payment,
    Refund
} from "@/types";

type ChatMessage = BookingMessage | ConversationMessage;

export default function CustomerBookingDetail() {
    const { id } = useParams();
    const [newMessage, setNewMessage] = useState("");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [proposalEntry, setProposalEntry] = useState<BookingHistoryEntry | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);
    const [refunds, setRefunds] = useState<Refund[]>([]);
    const [isRefundsLoading, setIsRefundsLoading] = useState(false);
    const [paymentProvider, setPaymentProvider] = useState("KHALTI");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [isPaying, setIsPaying] = useState(false);
    const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [quoteMessage, setQuoteMessage] = useState("");
    const [selectedInclusions, setSelectedInclusions] = useState<string[]>([]);
    const [customInclusions, setCustomInclusions] = useState<string[]>([]);
    const [customInclusionInput, setCustomInclusionInput] = useState("");
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);
    const [isQuoteSaving, setIsQuoteSaving] = useState(false);
    const [reviewRating, setReviewRating] = useState("5");
    const [reviewComment, setReviewComment] = useState("");
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
    const [hasReviewed, setHasReviewed] = useState(false);
    const [existingReview, setExistingReview] = useState<Review | null>(null);
    const [reportReason, setReportReason] = useState("");
    const [isReportSubmitting, setIsReportSubmitting] = useState(false);
    const { toast } = useToast();
    const { token } = useAuthStore();

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
                const res = await PaymentsService.getApiPayments({ bookingId: id, page: 1, limit: 20 });
                if (!active) return;
                setPayments(res?.items || []);
            } catch {
                if (!active) return;
                setPayments([]);
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
                const res = await PaymentsService.getApiRefundsCustomer({ bookingId: id, page: 1, limit: 20 });
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
        let active = true;
        const loadReview = async () => {
            if (!id) return;
            try {
                const res = (await ReviewsService.getApiReviewsBooking({ bookingId: id })) as Review | null;
                if (!active) return;
                setExistingReview(res || null);
                setHasReviewed(Boolean(res));
            } catch {
                if (!active) return;
                setExistingReview(null);
            }
        };
        loadReview();
        return () => {
            active = false;
        };
    }, [id]);

    const agreedAmount = quote?.amount ?? booking?.price ?? 0;
    const paidTotal = payments
        .filter((payment) => String(payment.status || "").toLowerCase() === "paid")
        .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const remainingAmount = Math.max(agreedAmount - paidTotal, 0);
    const refundedTotal = refunds
        .filter((refund) => String(refund.status || "").toUpperCase() === "PAID")
        .reduce((sum, refund) => sum + (refund.amount || 0), 0);

    useEffect(() => {
        if (!remainingAmount) {
            setPaymentAmount("");
            return;
        }
        if (!paymentAmount || Number(paymentAmount) > remainingAmount) {
            setPaymentAmount(String(remainingAmount));
        }
    }, [paymentAmount, remainingAmount]);

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
            }
        };

        socket.on("booking:update", handleBookingUpdate);
        return () => {
            socket.off("booking:update", handleBookingUpdate);
        };
    }, [id, token]);

    const getStatusIcon = (status: string) => {
        switch (status) {
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

    const formatHistoryStatus = (status: string) => {
        if (status === "proposal") return "Proposal";
        if (status === "payment") return "Payment";
        return status.replace(/-/g, " ");
    };

    const getStatusVariant = (status: string): BadgeProps["variant"] => {
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

    const isChatDisabled = booking?.status === "cancelled" || booking?.status === "rejected";
    const isBookingInactive = booking?.status === "cancelled" || booking?.status === "rejected";
    const isQuoteLocked = Boolean(isBookingInactive || (booking?.status && booking.status !== "pending"));

    const quoteStatusBanner = useMemo(() => {
        if (!quote) return null;
        if (quote.status === "rejected") return "Proposal rejected";
        return "Proposal saved. Share updates anytime.";
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
            const res = (await QuotesService.postApiBookingsQuote({
                id: booking._id,
                requestBody: {
                    amount,
                    message: quoteMessage || undefined,
                    packageInclusions: selectedInclusions,
                    customInclusions: mergedCustom
                }
            })) as Quote;
            setQuote(res);
            syncQuoteForm(res);
            if (res?.bookingStatus) {
                setBooking((prev) => (prev ? { ...prev, status: res.bookingStatus } : prev));
            }
            setCustomInclusionInput("");
            setCustomInclusions(mergedCustom);
            toast({ title: "Proposal sent", description: "Vendor will review your quote." });
        } catch (error) {
            toast({
                title: "Failed to send proposal",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsQuoteSaving(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isChatDisabled || !newMessage.trim() || !id) return;

        try {
            const convoId =
                conversationId ||
                (
                    await ConversationsService.postApiConversations({
                        requestBody: { bookingId: id }
                    })
                )._id;
            if (!conversationId) setConversationId(convoId);
            const message = await ConversationsService.postApiConversationsMessages({
                id: convoId,
                requestBody: { text: newMessage }
            });
            appendMessage(message);
            setNewMessage("");
            toast({ title: "Message sent" });
        } catch (error) {
            toast({
                title: "Failed to send message",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleCancel = async () => {
        if (!id) return;
        try {
            const res = (await BookingsService.patchApiBookingsCancel({
                id,
                requestBody: { reason: "Cancelled by customer" }
            })) as Booking;
            setBooking(res);
            toast({ title: "Booking cancelled", description: "The vendor has been notified." });
        } catch (error) {
            toast({
                title: "Failed to cancel booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleInitiatePayment = async () => {
        if (!booking) return;
        const amount = Number(paymentAmount);
        if (!agreedAmount) {
            toast({ title: "Missing price", description: "This booking has no price yet.", variant: "destructive" });
            return;
        }
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            toast({ title: "Enter a valid amount", description: "Please enter a payment amount." });
            return;
        }
        if (amount > remainingAmount) {
            toast({
                title: "Amount exceeds remaining",
                description: `Remaining balance is NPR ${remainingAmount.toLocaleString()}.`,
                variant: "destructive"
            });
            return;
        }
        setIsPaying(true);
        try {
            const res = await PaymentsService.postApiPayments({
                requestBody: {
                    bookingId: booking._id,
                    amount,
                    provider: paymentProvider
                }
            });
            if (res?.paymentId) {
                setPendingPaymentId(res.paymentId);
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
            toast({ title: "Payment initiated", description: "Complete the payment in the new window." });
        } catch (error) {
            toast({
                title: "Failed to initiate payment",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsPaying(false);
        }
    };

    const handleConfirmPayment = async () => {
        const idToConfirm = pendingPaymentId || payments[0]?._id;
        if (!idToConfirm) return;
        try {
            await PaymentsService.postApiPaymentsConfirm({ id: idToConfirm });
            const res = await PaymentsService.getApiPayments({ bookingId: booking?._id, page: 1, limit: 20 });
            setPayments(res?.items || []);
            if (booking?._id) {
                const bookingRes = await BookingsService.getApiBookings1({ id: booking._id });
                setBooking(bookingRes || booking);
            }
            toast({ title: "Payment confirmed" });
        } catch (error) {
            toast({
                title: "Failed to confirm payment",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleSubmitReview = async () => {
        if (!booking) return;
        const ratingValue = Number(reviewRating);
        if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
            toast({ title: "Select a rating between 1 and 5", variant: "destructive" });
            return;
        }
        setIsReviewSubmitting(true);
        try {
            const res = (await ReviewsService.postApiReviews({
                requestBody: {
                    bookingId: booking._id,
                    rating: ratingValue,
                    comment: reviewComment || undefined
                }
            })) as Review;
            setExistingReview(res);
            setHasReviewed(true);
            toast({ title: "Review submitted", description: "Thanks for your feedback." });
        } catch (error) {
            toast({
                title: "Failed to submit review",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsReviewSubmitting(false);
        }
    };

    const handleReportVendor = async () => {
        if (!booking) return;
        if (!reportReason.trim()) {
            toast({ title: "Please add a reason", variant: "destructive" });
            return;
        }
        setIsReportSubmitting(true);
        try {
            await ReportsService.postApiReports({
                requestBody: {
                    targetType: "vendor",
                    targetId: booking.vendorId,
                    reason: reportReason
                }
            });
            setReportReason("");
            toast({ title: "Report submitted", description: "Admin will review your report." });
        } catch (error) {
            toast({
                title: "Failed to submit report",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsReportSubmitting(false);
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
                    <Link to="/customer/bookings">Back to Bookings</Link>
                </Button>
            </div>
        );
    }

    const vendorName = booking.vendorName || booking.vendor?.businessName || "Vendor";
    const vendorImage = booking.vendorImage || booking.vendor?.portfolioMedia?.[0];
    const category = booking.category || booking.vendor?.category || "Service";
    const packageName = booking.packageName || booking.packageId || "Package";
    const price = agreedAmount || 0;
    const timeRange = booking.timeRange || { start: "--", end: "--" };
    const location = booking.location || "";
    const vendorPhone = booking.vendorPhone || booking.vendor?.contact?.phone || "";
    const vendorEmail = booking.vendorEmail || booking.vendor?.contact?.email || "";
    const history = booking.history || [];

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
                <div className="flex-2 space-y-6">
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
                                        <Badge variant={getStatusVariant(booking.status)} className="capitalize">
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

                            {booking.notes && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Notes: </span>
                                        {booking.notes}
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
                                {booking.status !== "completed" &&
                                    booking.status !== "cancelled" &&
                                    booking.status !== "rejected" &&
                                    booking.status !== "accepted" && (
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

                    {/* Timeline */}
                    <Card className="sticky top-6 mb-7">
                        <CardHeader>
                            <CardTitle className="text-lg">Booking Timeline</CardTitle>
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
                    {/* Payments */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Payments</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isPaymentsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading payments...</p>
                            ) : payments.length > 0 ? (
                                <div className="space-y-3">
                                    {payments.map((payment) => (
                                        <div
                                            key={payment._id}
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
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No payments yet.</p>
                            )}

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-sm font-medium text-foreground">Refunds</p>
                                {isRefundsLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading refunds...</p>
                                ) : refunds.length > 0 ? (
                                    <div className="space-y-3">
                                        {refunds.map((refund) => (
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
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No refunds yet.</p>
                                )}
                            </div>

                            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Total agreed</span>
                                    <span className="font-medium text-foreground">
                                        NPR {agreedAmount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Paid so far</span>
                                    <span className="font-medium text-foreground">
                                        NPR {paidTotal.toLocaleString()}
                                    </span>
                                </div>
                                {refundedTotal > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Refunded</span>
                                        <span className="font-medium text-foreground">
                                            NPR {refundedTotal.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Remaining</span>
                                    <span className="font-semibold text-foreground">
                                        NPR {remainingAmount.toLocaleString()}
                                    </span>
                                </div>
                                {!quote && (
                                    <p className="text-xs text-muted-foreground">
                                        Submit a proposal before making payment.
                                    </p>
                                )}
                            </div>

                            {booking.status === "accepted" && (
                                <div className="space-y-3">
                                    <label className="text-xs text-muted-foreground">Amount (NPR)</label>
                                    <div className="grid gap-3 sm:grid-cols-[1fr_200px_auto]">
                                            <Input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                placeholder="Enter amount"
                                            />
                                        <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select provider" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="KHALTI">Khalti</SelectItem>
                                                <SelectItem value="ESEWA">eSewa</SelectItem>
                                                <SelectItem value="MOCK">Mock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            onClick={handleInitiatePayment}
                                            disabled={isPaying || remainingAmount <= 0 || !quote}
                                        >
                                            {isPaying ? "Processing..." : "Pay Now"}
                                        </Button>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={handleConfirmPayment}
                                        disabled={!pendingPaymentId}
                                    >
                                        Confirm Payment
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="flex-1">
                    {/* Quote & Requirements */}
                    <Card className="mb-7">
                        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-lg">Quote & Requirements</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Define what you need and propose a price.
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
                                            {(booking?.packageInclusions || []).map((item) => (
                                                <label key={item} className="flex items-center gap-2 text-sm">
                                                    <Checkbox
                                                        checked={selectedInclusions.includes(item)}
                                                        onCheckedChange={() => handleToggleInclusion(item)}
                                                        disabled={isQuoteLocked || quote?.status === "accepted"}
                                                    />
                                                    <span>{item}</span>
                                                </label>
                                            ))}
                                            {!booking?.packageInclusions?.length && (
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
                                        {quote?.status === "rejected" && <Badge variant="destructive">Rejected</Badge>}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Messages */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Messages</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 max-h-80 overflow-y-auto mb-4">
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
                                                <div
                                                    key={getMessageId(msg, index)}
                                                    className={`flex ${
                                                        sender === "customer" ? "justify-end" : "justify-start"
                                                    }`}
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
                                ))}
                            </div>
                            {isChatDisabled && (
                                <p className="text-xs text-muted-foreground mb-3">
                                    Messaging is disabled for cancelled or rejected bookings.
                                </p>
                            )}
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1"
                                    disabled={isChatDisabled}
                                />
                                <Button type="submit" size="icon" disabled={isChatDisabled}>
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {booking.status === "completed" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Review & Report</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Share your experience with the vendor.
                                    </p>
                                    {existingReview ? (
                                        <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground">Rating</span>
                                                <span className="font-semibold text-foreground">
                                                    {existingReview.rating} / 5
                                                </span>
                                            </div>
                                            {existingReview.comment && (
                                                <p className="text-sm text-muted-foreground">
                                                    {existingReview.comment}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Submitted on{" "}
                                                {new Date(existingReview.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ) : (
                                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Rating</label>
                                            <Select value={reviewRating} onValueChange={setReviewRating}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select rating" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {[5, 4, 3, 2, 1].map((value) => (
                                                        <SelectItem key={value} value={String(value)}>
                                                            {value} Star{value > 1 ? "s" : ""}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Comment</label>
                                            <Textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                placeholder="Leave a short review"
                                            />
                                        </div>
                                    </div>
                                    )}
                                    <Button
                                        onClick={handleSubmitReview}
                                        disabled={isReviewSubmitting || hasReviewed || Boolean(existingReview)}
                                    >
                                        {hasReviewed
                                            ? "Review submitted"
                                            : isReviewSubmitting
                                              ? "Submitting..."
                                              : "Submit Review"}
                                    </Button>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Need to report this vendor? Provide details below.
                                    </p>
                                    <Textarea
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        placeholder="Describe the issue..."
                                    />
                                    <Button
                                        variant="destructive"
                                        onClick={handleReportVendor}
                                        disabled={isReportSubmitting}
                                    >
                                        {isReportSubmitting ? "Submitting..." : "Report Vendor"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
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
