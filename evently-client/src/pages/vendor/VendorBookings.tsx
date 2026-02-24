import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Calendar, MessageSquare, Check, X, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
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
            default:
                return "outline";
        }
    };

    const visibleBookings = activeTab === "all" ? bookings : bookings.filter((booking) => booking.status === activeTab);

    const bookingsList =
        visibleBookings.length > 0 ? (
            <div className="space-y-4">
                {visibleBookings.map((booking) => {
                    const customerName = booking.customer?.name || booking.customerName || "Customer";
                    const eventName = booking.eventType || "Event";
                    const price = booking.price || 0;
                    return (
                        <Card key={booking._id}>
                            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">{customerName}</span>
                                        <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                            {booking.status}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>{eventName}</span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {booking.date}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">NPR {price.toLocaleString()}</span>
                                    {booking.status === "pending" && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="success"
                                                onClick={() => handleAccept(booking._id)}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleReject(booking._id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="ghost" asChild>
                                        <Link to={`/vendor/bookings/${booking._id}`}>
                                            <MessageSquare className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
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
            <div>
                <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                <p className="text-muted-foreground">Manage your booking requests</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
                <TabsContent value="pending" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
                <TabsContent value="confirmed" className="mt-6 space-y-4">
                    {bookingsList}
                </TabsContent>
            </Tabs>
        </div>
    );
}
