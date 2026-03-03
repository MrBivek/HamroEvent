import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Search, Filter, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { BookingsService } from "@/services/BookingsService";
import { resolveMediaUrl } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking } from "@/types";

export default function CustomerBookings() {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await BookingsService.getApiBookings({ page: 1, limit: 50 });
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
            case "cancelled":
                return "destructive";
            default:
                return "outline";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "confirmed":
            case "completed":
                return <CheckCircle2 className="h-4 w-4" />;
            case "pending":
            case "accepted":
                return <Clock className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const filteredBookings = bookings.filter((booking) => {
        const vendorName = booking.vendorName || booking.vendor?.businessName || "";
        const category = booking.category || booking.vendor?.category || "";
        const eventTitle = booking.eventTitle || "";
        const matchesSearch =
            vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eventTitle.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === "all" || booking.status === activeTab;
        return matchesSearch && matchesTab;
    });

    type BookingGroup = {
        key: string;
        eventId?: string;
        title: string;
        date: string;
        eventType: string;
        location: string;
        bookings: Booking[];
    };

    const groupedBookings = filteredBookings.reduce(
        (acc, booking) => {
            const key = booking.eventId || `${booking.eventTitle || booking.eventType}-${booking.date}`;
            let group = acc.map.get(key);
            if (!group) {
                group = {
                    key,
                    eventId: booking.eventId,
                    title: booking.eventTitle || booking.eventType || "Event",
                    date: booking.date,
                    eventType: booking.eventType,
                    location: booking.location,
                    bookings: []
                };
                acc.map.set(key, group);
                acc.list.push(group);
            }
            group.bookings.push(booking);
            return acc;
        },
        { list: [] as BookingGroup[], map: new Map<string, BookingGroup>() }
    ).list;

    groupedBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
                <p className="text-muted-foreground">Track and manage your vendor bookings</p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start bg-muted/50 p-1">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6">
                    {groupedBookings.length > 0 ? (
                        <div className="space-y-6">
                            {groupedBookings.map((group, groupIndex) => (
                                <motion.div
                                    key={group.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: groupIndex * 0.05 }}
                                    className="space-y-4"
                                >
                                    <Card className="border-border/60 bg-muted/40">
                                        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                                    Event
                                                </p>
                                                <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(group.date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric"
                                                        })}
                                                    </span>
                                                    <span>{group.eventType}</span>
                                                    <span>{group.location}</span>
                                                </div>
                                            </div>
                                            {group.eventId && (
                                                <Button variant="outline" asChild>
                                                    <Link to={`/customer/events/${group.eventId}`}>View Event</Link>
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        {group.bookings.map((booking, index) => {
                                            const vendorName =
                                                booking.vendorName || booking.vendor?.businessName || "Vendor";
                                            const vendorImage = booking.vendorImage || booking.vendor?.portfolioMedia?.[0];
                                            const category = booking.category || booking.vendor?.category || "Service";
                                            const price = booking.price || 0;
                                            const location = booking.location || "";
                                            return (
                                                <motion.div
                                                    key={booking._id}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                >
                                                    <Card variant="interactive">
                                                        <CardContent className="p-4">
                                                            <div className="flex flex-col sm:flex-row gap-4">
                                                                <img
                                                                    src={resolveMediaUrl(vendorImage)}
                                                                    alt={vendorName}
                                                                    className="w-full sm:w-24 h-24 rounded-lg object-cover"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                                                        <div>
                                                                            <h3 className="font-semibold text-foreground">
                                                                                {vendorName}
                                                                            </h3>
                                                                            <p className="text-sm text-muted-foreground">
                                                                                {category}
                                                                            </p>
                                                                        </div>
                                                                        <Badge
                                                                            variant={getStatusVariant(booking.status)}
                                                                            className="capitalize gap-1"
                                                                        >
                                                                            {getStatusIcon(booking.status)}
                                                                            {booking.status}
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                                                                        <span className="flex items-center gap-1">
                                                                            <Calendar className="h-4 w-4" />
                                                                            {new Date(booking.date).toLocaleDateString("en-US", {
                                                                                month: "short",
                                                                                day: "numeric",
                                                                                year: "numeric"
                                                                            })}
                                                                        </span>
                                                                        <span>{booking.eventType}</span>
                                                                        <span>{location}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-semibold text-foreground">
                                                                            NPR {price.toLocaleString()}
                                                                        </span>
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <Link to={`/customer/bookings/${booking._id}`}>
                                                                                <MessageSquare className="h-4 w-4 mr-1" />
                                                                                View Details
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <Card className="py-16 text-center">
                            <CardContent>
                                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-foreground mb-2">No bookings found</h3>
                                <p className="text-muted-foreground mb-4">
                                    {searchTerm ? "Try adjusting your search" : "Start by browsing vendors"}
                                </p>
                                <Button variant="hero" asChild>
                                    <Link to="/vendors">Browse Vendors</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
