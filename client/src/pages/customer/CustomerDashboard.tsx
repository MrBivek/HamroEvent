import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { EChartsOption } from "echarts";
import {
    ArrowRight,
    Calendar,
    Clock,
    FolderOpen,
    Heart,
    MapPin,
    Sparkles,
    Star,
    TrendingUp,
    Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { EChart, getChartColor } from "@/components/charts/EChart.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import { useShortlistStore } from "@/store/shortlistStore.ts";
import { BookingsService } from "@/services/BookingsService";
import { EventsService } from "@/services/EventsService";
import { FavoritesService } from "@/services/FavoritesService";
import { resolveMediaUrl } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking, Event, VendorProfile } from "@/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthlyCounts(values: Array<string | undefined>) {
    const currentYear = new Date().getFullYear();
    const counts = Array.from({ length: 12 }, () => 0);

    values.forEach((value) => {
        if (!value) return;
        const date = new Date(value);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== currentYear) return;
        counts[date.getMonth()] += 1;
    });

    return counts;
}

function formatCurrency(value: number) {
    return `NPR ${value.toLocaleString()}`;
}

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
                    BookingsService.getApiBookings({ page: 1, limit: 50 }),
                    EventsService.getApiEvents({ page: 1, limit: 50 }),
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
            case "completed":
                return "soft";
            default:
                return "outline";
        }
    };

    const upcomingBookings = [...bookings]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);
    const recentEvents = [...events]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 4);
    const totalBudget = events.reduce((sum, event) => sum + (event.budget || 0), 0);
    const confirmedBookings = bookings.filter((booking) =>
        ["accepted", "confirmed", "completed"].includes(booking.status)
    ).length;
    const completedBookings = bookings.filter((booking) => booking.status === "completed").length;
    const averageVendorRating =
        shortlistedVendorProfiles.length > 0
            ? shortlistedVendorProfiles.reduce((sum, vendor) => sum + (vendor.ratingAvg || 0), 0) /
              shortlistedVendorProfiles.length
            : 0;

    const bookingTrendOption: EChartsOption = {
        animationDuration: 700,
        tooltip: {
            trigger: "axis",
            backgroundColor: getChartColor("--card", "#ffffff"),
            borderColor: getChartColor("--border", "#e5e7eb"),
            textStyle: {
                color: getChartColor("--foreground", "#111827")
            }
        },
        legend: {
            bottom: 0,
            textStyle: {
                color: getChartColor("--muted-foreground", "#6b7280")
            }
        },
        grid: {
            left: 16,
            right: 16,
            top: 24,
            bottom: 48,
            containLabel: true
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: MONTH_LABELS,
            axisLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb") } },
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") }
        },
        yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb"), opacity: 0.6 } },
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") }
        },
        series: [
            {
                name: "Bookings",
                type: "line",
                smooth: true,
                symbolSize: 8,
                data: buildMonthlyCounts(bookings.map((booking) => booking.createdAt)),
                lineStyle: { width: 3, color: getChartColor("--primary", "#6366f1") },
                itemStyle: { color: getChartColor("--primary", "#6366f1") },
                areaStyle: {
                    color: getChartColor("--primary-soft", "#eef2ff")
                }
            },
            {
                name: "Events",
                type: "line",
                smooth: true,
                symbolSize: 8,
                data: buildMonthlyCounts(events.map((event) => event.createdAt)),
                lineStyle: { width: 3, color: getChartColor("--secondary", "#14b8a6") },
                itemStyle: { color: getChartColor("--secondary", "#14b8a6") },
                areaStyle: {
                    color: getChartColor("--secondary-soft", "#ccfbf1")
                }
            }
        ]
    };

    const statusBreakdownOption: EChartsOption = {
        animationDuration: 700,
        tooltip: {
            trigger: "item",
            backgroundColor: getChartColor("--card", "#ffffff"),
            borderColor: getChartColor("--border", "#e5e7eb"),
            textStyle: {
                color: getChartColor("--foreground", "#111827")
            }
        },
        legend: {
            bottom: 0,
            textStyle: {
                color: getChartColor("--muted-foreground", "#6b7280")
            }
        },
        series: [
            {
                type: "pie",
                radius: ["52%", "75%"],
                avoidLabelOverlap: true,
                label: {
                    show: false
                },
                itemStyle: {
                    borderRadius: 14,
                    borderColor: getChartColor("--card", "#ffffff"),
                    borderWidth: 4
                },
                data: [
                    {
                        value: bookings.filter((booking) => booking.status === "pending").length,
                        name: "Pending",
                        itemStyle: { color: getChartColor("--warning", "#f59e0b") }
                    },
                    {
                        value: bookings.filter((booking) => booking.status === "accepted").length,
                        name: "Accepted",
                        itemStyle: { color: getChartColor("--secondary", "#14b8a6") }
                    },
                    {
                        value: bookings.filter((booking) => booking.status === "confirmed").length,
                        name: "Confirmed",
                        itemStyle: { color: getChartColor("--primary", "#6366f1") }
                    },
                    {
                        value: bookings.filter((booking) => booking.status === "completed").length,
                        name: "Completed",
                        itemStyle: { color: getChartColor("--success", "#22c55e") }
                    }
                ]
            }
        ]
    };

    const eventReadinessOption: EChartsOption = {
        animationDuration: 700,
        tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
            backgroundColor: getChartColor("--card", "#ffffff"),
            borderColor: getChartColor("--border", "#e5e7eb"),
            textStyle: {
                color: getChartColor("--foreground", "#111827")
            }
        },
        grid: {
            left: 16,
            right: 16,
            top: 16,
            bottom: 16,
            containLabel: true
        },
        xAxis: {
            type: "value",
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") },
            splitLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb"), opacity: 0.5 } }
        },
        yAxis: {
            type: "category",
            data: recentEvents.map((event) => event.title),
            axisLabel: {
                color: getChartColor("--muted-foreground", "#6b7280"),
                width: 120,
                overflow: "truncate"
            },
            axisLine: { show: false },
            axisTick: { show: false }
        },
        series: [
            {
                type: "bar",
                data: recentEvents.map((event) => event.vendorCount ?? event.bookings?.length ?? 0),
                barWidth: 18,
                itemStyle: {
                    borderRadius: [999, 999, 999, 999],
                    color: getChartColor("--accent", "#f97316")
                }
            }
        ]
    };

    return (
        <div className="space-y-6">
            <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[28px] border border-border/60 gradient-wave p-6 md:p-8 shadow-card"
            >
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_55%)]" />
                <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-4">
                        <Badge
                            variant="soft"
                            className="w-fit gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Planning Command Center
                        </Badge>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                Welcome back, {user?.name?.split(" ")[0]}
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                                Your bookings, event momentum, and favorite vendors are all moving here. Use this space
                                to keep every celebration on track.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="hero">
                                <Link to="/customer/events">Manage Events</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/vendors">Explore Vendors</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                                        <FolderOpen className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                            Active events
                                        </p>
                                        <p className="text-2xl font-semibold text-foreground">{events.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-soft text-secondary">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                            Confirmed flow
                                        </p>
                                        <p className="text-2xl font-semibold text-foreground">{confirmedBookings}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                            Planned budget
                                        </p>
                                        <p className="text-xl font-semibold text-foreground">
                                            {formatCurrency(totalBudget)}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </motion.section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    {
                        label: "Pending bookings",
                        value: bookings.filter((booking) => booking.status === "pending").length,
                        icon: Clock,
                        color: "bg-warning-soft text-warning"
                    },
                    {
                        label: "Completed bookings",
                        value: completedBookings,
                        icon: Calendar,
                        color: "bg-success-soft text-success"
                    },
                    {
                        label: "Favorites",
                        value: shortlistedVendors.length,
                        icon: Heart,
                        color: "bg-destructive-soft text-destructive"
                    },
                    {
                        label: "Avg favorite rating",
                        value: averageVendorRating.toFixed(1),
                        icon: Star,
                        color: "bg-primary-soft text-primary"
                    }
                ].map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                    >
                        <Card className="overflow-hidden">
                            <CardContent className="p-5">
                                <div
                                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${stat.color}`}
                                >
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <p className="text-3xl font-semibold text-foreground">{stat.value}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Planning Activity</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Your bookings and event creation volume across the current year.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={bookingTrendOption} height={340} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Booking Mix</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            A quick view of where your requests currently stand.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={statusBreakdownOption} height={340} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                The nearest bookings that need your attention.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/customer/bookings">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {upcomingBookings.length > 0 ? (
                            upcomingBookings.map((booking) => (
                                <Link
                                    key={booking._id}
                                    to={`/customer/bookings/${booking._id}`}
                                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="space-y-1">
                                        <p className="font-medium text-foreground">
                                            {booking.vendor?.businessName || booking.vendorName || "Vendor"}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>
                                                {new Date(booking.date).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                            <span>•</span>
                                            <span>{booking.category || booking.vendor?.category || "Service"}</span>
                                        </div>
                                    </div>
                                    <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                        {booking.status}
                                    </Badge>
                                </Link>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                No bookings yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Event Readiness</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            See which event plans already have vendor assignments.
                        </p>
                    </CardHeader>
                    <CardContent>
                        {recentEvents.length > 0 ? (
                            <EChart option={eventReadinessOption} height={320} />
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                Create an event to start tracking vendor readiness.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">My Events</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Quick access to your latest event workspaces.
                            </p>
                        </div>
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
                                    key={event._id}
                                    to={`/customer/events/${event._id}`}
                                    className="block rounded-2xl border border-border/70 p-4 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="font-medium text-foreground">{event.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(event.date).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </p>
                                        </div>
                                        <Badge variant="soft">
                                            {event.vendorCount ?? event.bookings?.length ?? 0} vendors
                                        </Badge>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                No events yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Favorite Vendors</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Your shortlist, ready for the next booking decision.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/customer/favorites">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {shortlistedVendorProfiles.length > 0 ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                {shortlistedVendorProfiles.slice(0, 4).map((vendor) => (
                                    <Link
                                        key={vendor._id}
                                        to={`/vendors/${vendor._id}`}
                                        className="flex items-center gap-4 rounded-2xl border border-border/70 p-4 transition-colors hover:bg-muted/50"
                                    >
                                        <img
                                            src={resolveMediaUrl(vendor.portfolioMedia[0])}
                                            alt={vendor.businessName}
                                            className="h-14 w-14 rounded-2xl object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-foreground">
                                                {vendor.businessName}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                                                    {vendor.ratingAvg.toFixed(1)}
                                                </span>
                                                <span>•</span>
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {vendor.location}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                Shortlist vendors to keep them handy here.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
