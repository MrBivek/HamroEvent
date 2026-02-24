import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, FolderOpen, Heart, Clock, ArrowRight, Star, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import { useShortlistStore } from "@/store/shortlistStore.ts";
import { BookingsService } from "@/services/BookingsService";
import { EventsService } from "@/services/EventsService";
import { FavoritesService } from "@/services/FavoritesService";
import { resolveMediaUrl } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking, Event, VendorProfile } from "@/types";

export default function CustomerDashboard() {
    const { user } = useAuthStore();
    const { shortlistedVendors, loadShortlist } = useShortlistStore();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [shortlistedVendorProfiles, setShortlistedVendorProfiles] = useState<VendorProfile[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                await loadShortlist();
                const [bookingRes, eventRes, favoritesRes] = await Promise.all([
                    BookingsService.getApiBookings({ page: 1, limit: 20 }),
                    EventsService.getApiEvents({ page: 1, limit: 10 }),
                    FavoritesService.getApiFavorites({ page: 1, limit: 20 })
                ]);
                if (!active) return;
                setBookings(bookingRes?.items || []);
                setEvents(eventRes?.items || []);
                setShortlistedVendorProfiles(favoritesRes?.items || []);
            } catch {
                if (!active) return;
                setBookings([]);
                setEvents([]);
                setShortlistedVendorProfiles([]);
            }
        };
        if (user) load();
        return () => {
            active = false;
        };
    }, [user, loadShortlist]);

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

    const upcomingBookings = bookings.slice(0, 3).map((booking) => ({
        id: booking._id,
        vendorName: booking.vendor?.businessName || booking.vendorName || "Vendor",
        date: booking.date,
        status: booking.status,
        category: booking.vendor?.category || booking.category || "Service"
    }));

    const recentEvents = events.slice(0, 3).map((event) => ({
        id: event._id,
        title: event.title,
        date: event.date,
        vendorCount: event.vendorCount ?? event.bookings?.length ?? 0
    }));

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    Welcome back, {user?.name?.split(" ")[0]}!
                </h1>
                <p className="text-muted-foreground mt-1">Here's an overview of your event planning activities.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Active Events",
                        value: String(events.length),
                        icon: FolderOpen,
                        color: "bg-primary-soft text-primary"
                    },
                    {
                        label: "Pending Bookings",
                        value: String(bookings.filter((b) => b.status === "pending").length),
                        icon: Clock,
                        color: "bg-warning-soft text-warning"
                    },
                    {
                        label: "Confirmed",
                        value: String(bookings.filter((b) => b.status === "confirmed").length),
                        icon: Calendar,
                        color: "bg-success-soft text-success"
                    },
                    {
                        label: "Shortlisted",
                        value: shortlistedVendors.length.toString(),
                        icon: Heart,
                        color: "bg-destructive-soft text-destructive"
                    }
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card>
                            <CardContent className="p-4">
                                <div
                                    className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color} mb-3`}
                                >
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Bookings */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/customer/bookings">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {upcomingBookings.map((booking) => (
                            <Link
                                key={booking.id}
                                to={`/customer/bookings/${booking.id}`}
                                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{booking.vendorName}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {new Date(booking.date).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                        <span>•</span>
                                        <span>{booking.category}</span>
                                    </div>
                                </div>
                                <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                    {booking.status}
                                </Badge>
                            </Link>
                        ))}
                    </CardContent>
                </Card>

                {/* My Events */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">My Events</CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/customer/events">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentEvents.length > 0 ? (
                            recentEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    to={`/customer/events/${event.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{event.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(event.date).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </div>
                                    </div>
                                    <Badge variant="soft">{event.vendorCount} vendors</Badge>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-6">
                                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">No events yet</p>
                                <Button variant="outline" size="sm" className="mt-3" asChild>
                                    <Link to="/customer/events">Create Event</Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Shortlisted Vendors */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Shortlisted Vendors</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                        <Link to="/customer/shortlist">
                            View All <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {shortlistedVendorProfiles.length > 0 ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {shortlistedVendorProfiles.slice(0, 3).map((vendor) => (
                                <Link
                                    key={vendor._id}
                                    to={`/vendors/${vendor._id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <img
                                        src={resolveMediaUrl(vendor.portfolioMedia[0])}
                                        alt={vendor.businessName}
                                        className="h-12 w-12 rounded-lg object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{vendor.businessName}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                                            <span>{vendor.ratingAvg}</span>
                                            <span>•</span>
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{vendor.location}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">No vendors shortlisted yet</p>
                            <Button variant="outline" size="sm" className="mt-3" asChild>
                                <Link to="/vendors">Browse Vendors</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
