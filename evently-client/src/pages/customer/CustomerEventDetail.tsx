import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, DollarSign, Users, Plus, MessageSquare, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { EventsService } from "@/services/EventsService";
import { fetchAvailableVendors } from "@/lib/vendors.ts";
import { resolveMediaUrl } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking, Event, VendorProfile } from "@/types";

export default function CustomerEventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVendorPickerOpen, setIsVendorPickerOpen] = useState(false);
    const [availableVendors, setAvailableVendors] = useState<VendorProfile[]>([]);
    const [isVendorsLoading, setIsVendorsLoading] = useState(false);
    const [vendorQuery, setVendorQuery] = useState("");

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id) return;
            try {
                const res = await EventsService.getApiEvents1({ id });
                if (!active) return;
                setEvent(res || null);
            } catch {
                if (!active) return;
                setEvent(null);
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
        const loadVendors = async () => {
            if (!event || !isVendorPickerOpen) return;
            setIsVendorsLoading(true);
            try {
                const date = event.date?.slice(0, 10);
                const res = await fetchAvailableVendors({
                    date,
                    startTime: event.startTime || undefined,
                    endTime: event.endTime || undefined,
                    page: 1,
                    limit: 24
                });
                if (!active) return;
                setAvailableVendors(res.items || []);
            } catch {
                if (!active) return;
                setAvailableVendors([]);
            } finally {
                if (active) setIsVendorsLoading(false);
            }
        };
        loadVendors();
        return () => {
            active = false;
        };
    }, [event, isVendorPickerOpen]);

    if (isLoading) {
        return (
            <div className="container py-16 text-center">
                <p className="text-muted-foreground">Loading event...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
                <Button asChild>
                    <Link to="/customer/events">Back to Events</Link>
                </Button>
            </div>
        );
    }

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

    const totalSpent = (event.bookings || []).reduce((sum: number, b: Booking) => sum + (b.price || 0), 0);
    const remainingBudget = (event.budget || 0) - totalSpent;

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to="/customer/events"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Events
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <Badge variant="soft" className="mb-2">
                        {event.eventType}
                    </Badge>
                    <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric"
                            })}
                        </span>
                        {(event.startTime || event.endTime) && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {event.startTime || "--:--"} - {event.endTime || "--:--"}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                        </span>
                    </div>
                </div>
                <Button variant="hero" onClick={() => setIsVendorPickerOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                </Button>
            </div>

            {/* Budget Overview */}
            <div className="grid sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Budget</p>
                                <p className="text-lg font-semibold text-foreground">
                                    NPR {(event.budget || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Spent</p>
                                <p className="text-lg font-semibold text-foreground">
                                    NPR {totalSpent.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    remainingBudget >= 0 ? "bg-success-soft" : "bg-destructive-soft"
                                }`}
                            >
                                <DollarSign
                                    className={`h-5 w-5 ${remainingBudget >= 0 ? "text-success" : "text-destructive"}`}
                                />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Remaining</p>
                                <p
                                    className={`text-lg font-semibold ${remainingBudget >= 0 ? "text-success" : "text-destructive"}`}
                                >
                                    NPR {remainingBudget.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            {event.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{event.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Linked Bookings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Linked Vendors ({event.bookings?.length || 0})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {(event.bookings || []).map((booking) => (
                            <div
                                key={booking._id || booking.id}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">{booking.vendorName}</span>
                                        <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                            {booking.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{booking.category}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">
                                        NPR {(booking.price || 0).toLocaleString()}
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/customer/bookings/${booking._id || booking.id}`}>
                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                View
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isVendorPickerOpen} onOpenChange={setIsVendorPickerOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Available Vendors</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search vendors..."
                                value={vendorQuery}
                                onChange={(e) => setVendorQuery(e.target.value)}
                            />
                            <Badge variant="soft">
                                {event.startTime && event.endTime
                                    ? `${event.startTime}-${event.endTime}`
                                    : "All day"}
                            </Badge>
                        </div>

                        {isVendorsLoading ? (
                            <div className="py-12 text-center text-muted-foreground">Loading vendors...</div>
                        ) : availableVendors.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                No available vendors found for this date/time.
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {availableVendors
                                    .filter((vendor) =>
                                        vendorQuery
                                            ? vendor.businessName.toLowerCase().includes(vendorQuery.toLowerCase())
                                            : true
                                    )
                                    .map((vendor) => (
                                        <Card key={vendor._id} variant="interactive">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={resolveMediaUrl(vendor.portfolioMedia?.[0])}
                                                        alt={vendor.businessName}
                                                        className="h-12 w-12 rounded-lg object-cover"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {vendor.businessName}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground truncate">
                                                            {vendor.category} • {vendor.location}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Star className="h-4 w-4 fill-warning text-warning" />
                                                        {vendor.ratingAvg.toFixed(1)}
                                                    </span>
                                                    <span>{vendor.ratingCount} reviews</span>
                                                </div>
                                                <Button variant="outline" className="w-full" asChild>
                                                    <Link to={`/vendors/${vendor._id}`}>
                                                        View Vendor
                                                    </Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
