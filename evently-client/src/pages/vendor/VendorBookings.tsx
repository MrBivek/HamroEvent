import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, MessageSquare, Check, X, Clock, MapPin, Package, User, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { VendorBookingsService } from "@/services/VendorBookingsService";
import { getErrorMessage } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking } from "@/types";

export default function VendorBookings() {
    const { toast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [activeTab, setActiveTab] = useState("all");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await VendorBookingsService.getApiVendorsMeBookings({ page: 1, limit: 50 });
                if (!active) return;
                setBookings(res?.items || []);
            } catch {
                if (!active) return;
                setBookings([]);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleAccept = async (id: string) => {
        try {
            const res = await VendorBookingsService.patchApiVendorsMeBookingsDecision({
                id,
                requestBody: { decision: "ACCEPT" }
            });
            setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: res.status } : b)));
            toast({ title: "Booking accepted" });
        } catch (error) {
            toast({
                title: "Failed to accept booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleReject = async (id: string) => {
        try {
            const res = await VendorBookingsService.patchApiVendorsMeBookingsDecision({
                id,
                requestBody: { decision: "REJECT" }
            });
            setBookings((prev) => prev.map((b) => (b._id === id ? { ...b, status: res.status } : b)));
            toast({ title: "Booking rejected" });
        } catch (error) {
            toast({
                title: "Failed to reject booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const getStatusVariant = (status: string): BadgeProps["variant"] => {
        switch (status) {
            case "confirmed":
                return "success";
            case "accepted":
                return "soft-secondary";
            case "pending":
                return "warning";
            case "rejected":
                return "destructive";
            default:
                return "outline";
        }
    };

    const visibleBookings = activeTab === "all" ? bookings : bookings.filter((booking) => booking.status === activeTab);
    const counts = {
        total: bookings.length,
        pending: bookings.filter((b) => b.status === "pending").length,
        accepted: bookings.filter((b) => b.status === "accepted").length,
        confirmed: bookings.filter((b) => b.status === "confirmed").length,
        completed: bookings.filter((b) => b.status === "completed").length
    };

    const bookingsList =
        visibleBookings.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
                {visibleBookings.map((booking) => {
                    const customerName = booking.customer?.name || booking.customerName || "Customer";
                    const eventName = booking.eventType || "Event";
                    const price = booking.price || 0;
                    const timeRange = booking.timeRange || { start: "--", end: "--" };
                    const location = booking.location || "—";
                    const packageName = booking.packageName || "Package";
                    const customerPhone = booking.customer?.phone || "";
                    const customerEmail = booking.customer?.email || "";
                    const canAccept = booking.status === "pending" && Boolean(booking.hasQuote);
                    return (
                        <Card key={booking._id} variant="interactive" className="h-full">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Booking Request</p>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            {customerName}
                                        </CardTitle>
                                    </div>
                                    <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                        {booking.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        <span>
                                            {eventName} • {packageName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {new Date(booking.date).toLocaleDateString("en-US", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        <span>
                                            {timeRange.start} - {timeRange.end}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        <span>{location}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-border pt-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Estimated Value</p>
                                        <p className="text-base font-semibold text-foreground">
                                            NPR {price.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {booking.status === "pending" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="success"
                                                    onClick={() => handleAccept(booking._id)}
                                                    disabled={!canAccept}
                                                >
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Accept
                                                </Button>
                                                {!canAccept && (
                                                    <span className="text-xs text-muted-foreground self-center">
                                                        Awaiting proposal
                                                    </span>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleReject(booking._id)}
                                                >
                                                    <X className="h-4 w-4 mr-1" />
                                                    Decline
                                                </Button>
                                            </>
                                        )}
                                        <Button size="sm" variant="ghost" asChild>
                                            <Link to={`/vendor/bookings/${booking._id}`}>
                                                <MessageSquare className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>

                                {(customerPhone || customerEmail) && (
                                    <div className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                                        {customerPhone && (
                                            <a
                                                href={`tel:${customerPhone}`}
                                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <Phone className="h-4 w-4" /> {customerPhone}
                                            </a>
                                        )}
                                        {customerEmail && (
                                            <a
                                                href={`mailto:${customerEmail}`}
                                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <Mail className="h-4 w-4" /> {customerEmail}
                                            </a>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        ) : (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">No bookings found.</CardContent>
            </Card>
        );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                    <p className="text-muted-foreground">Manage your booking requests</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-semibold text-foreground">{counts.total}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Pending</p>
                            <p className="text-lg font-semibold text-foreground">{counts.pending}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Accepted</p>
                            <p className="text-lg font-semibold text-foreground">{counts.accepted}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Confirmed</p>
                            <p className="text-lg font-semibold text-foreground">{counts.confirmed}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-3 text-center">
                            <p className="text-xs text-muted-foreground">Completed</p>
                            <p className="text-lg font-semibold text-foreground">{counts.completed}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
                <TabsContent value="pending" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
                <TabsContent value="accepted" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
                <TabsContent value="confirmed" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
            </Tabs>
        </div>
    );
}
