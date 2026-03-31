import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";
import {
    AlertCircle,
    ArrowRight,
    BadgeCheck,
    Calendar,
    Clock,
    Mail,
    MapPin,
    Package,
    Phone,
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
import { VendorsService } from "@/services/VendorsService";
import { VendorBookingsService } from "@/services/VendorBookingsService";
import { VendorPaymentsService } from "@/services/VendorPaymentsService";
import type { Booking, VendorPaymentSummary, VendorPaymentTransaction, VendorProfile } from "@/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCurrency(value: number) {
    return `NPR ${value.toLocaleString()}`;
}

export default function VendorDashboard() {
    const { user } = useAuthStore();
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [paymentSummary, setPaymentSummary] = useState<VendorPaymentSummary>({
        totalEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        thisMonth: 0,
        growth: 0
    });
    const [transactions, setTransactions] = useState<VendorPaymentTransaction[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [vendorRes, bookingsRes, summaryRes, transactionRes] = await Promise.all([
                    VendorsService.getApiVendorsMe(),
                    VendorBookingsService.getApiVendorsMeBookings({ page: 1, limit: 50 }),
                    VendorPaymentsService.getApiVendorsMePaymentsSummary(),
                    VendorPaymentsService.getApiVendorsMePaymentsTransactions()
                ]);
                if (!active) return;
                setVendor(vendorRes);
                setBookings(bookingsRes?.items || []);
                setPaymentSummary(summaryRes as VendorPaymentSummary);
                setTransactions(((transactionRes as { items?: VendorPaymentTransaction[] })?.items || []).slice(0, 12));
            } catch {
                if (!active) return;
                setVendor(null);
                setBookings([]);
                setTransactions([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const pendingBookings = bookings.filter((booking) => booking.status === "pending").slice(0, 4);
    const activeBookings = bookings.filter((booking) => ["accepted", "confirmed"].includes(booking.status)).length;
    const completedBookings = bookings.filter((booking) => booking.status === "completed").length;

    const stats = [
        {
            label: "Pending requests",
            value: bookings.filter((booking) => booking.status === "pending").length,
            icon: Clock,
            color: "bg-warning-soft text-warning"
        },
        {
            label: "Active bookings",
            value: activeBookings,
            icon: Calendar,
            color: "bg-primary-soft text-primary"
        },
        {
            label: "This month",
            value: formatCurrency(paymentSummary.thisMonth),
            icon: Wallet,
            color: "bg-secondary-soft text-secondary"
        },
        {
            label: "Rating",
            value: vendor ? vendor.ratingAvg.toFixed(1) : "0.0",
            icon: Star,
            color: "bg-accent-soft text-accent"
        }
    ];

    const bookingPipelineOption: EChartsOption = {
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
                radius: ["48%", "76%"],
                itemStyle: {
                    borderRadius: 14,
                    borderColor: getChartColor("--card", "#ffffff"),
                    borderWidth: 4
                },
                label: { show: false },
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
                        value: completedBookings,
                        name: "Completed",
                        itemStyle: { color: getChartColor("--success", "#22c55e") }
                    },
                    {
                        value: bookings.filter((booking) => booking.status === "rejected").length,
                        name: "Rejected",
                        itemStyle: { color: getChartColor("--destructive", "#ef4444") }
                    }
                ]
            }
        ]
    };

    const revenueByMonth = transactions.reduce<number[]>(
        (accumulator, transaction) => {
            const date = new Date(transaction.date);
            if (Number.isNaN(date.getTime())) return accumulator;
            const sign = transaction.type === "debit" ? -1 : 1;
            accumulator[date.getMonth()] += sign * transaction.amount;
            return accumulator;
        },
        Array.from({ length: 12 }, () => 0)
    );

    const revenueTrendOption: EChartsOption = {
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
            top: 24,
            bottom: 24,
            containLabel: true
        },
        xAxis: {
            type: "category",
            data: MONTH_LABELS,
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") },
            axisLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb") } }
        },
        yAxis: {
            type: "value",
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") },
            splitLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb"), opacity: 0.6 } }
        },
        series: [
            {
                type: "bar",
                data: revenueByMonth,
                barWidth: 20,
                itemStyle: {
                    borderRadius: [10, 10, 0, 0],
                    color: getChartColor("--primary", "#6366f1")
                }
            }
        ]
    };

    const recentTransactionOption: EChartsOption = {
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
            top: 20,
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
            data: transactions.slice(0, 6).map((transaction) => transaction.booking),
            axisLabel: {
                color: getChartColor("--muted-foreground", "#6b7280"),
                width: 130,
                overflow: "truncate"
            },
            axisTick: { show: false },
            axisLine: { show: false }
        },
        series: [
            {
                type: "bar",
                data: transactions.slice(0, 6).map((transaction) => ({
                    value: transaction.amount,
                    itemStyle: {
                        color:
                            transaction.type === "debit"
                                ? getChartColor("--destructive", "#ef4444")
                                : getChartColor("--secondary", "#14b8a6"),
                        borderRadius: [999, 999, 999, 999]
                    }
                })),
                barWidth: 16
            }
        ]
    };

    const handleDecision = async (id: string, decision: "ACCEPT" | "REJECT") => {
        try {
            const response = await VendorBookingsService.patchApiVendorsMeBookingsDecision({
                id,
                requestBody: { decision }
            });
            setBookings((previous) =>
                previous.map((booking) => (booking._id === id ? { ...booking, status: response.status } : booking))
            );
        } catch {
            // keep dashboard interactions lightweight
        }
    };

    return (
        <div className="space-y-6">
            {vendor && vendor.verificationStatus !== "verified" && (
                <Card className="border-warning/30 bg-warning-soft/70">
                    <CardContent className="flex items-center gap-4 p-4">
                        <AlertCircle className="h-6 w-6 text-warning" />
                        <div className="flex-1">
                            <p className="font-medium text-foreground">Verification still matters for visibility</p>
                            <p className="text-sm text-muted-foreground">
                                Finish your verification to improve trust and unlock package publishing confidence.
                            </p>
                        </div>
                        <Button variant="warning" size="sm" asChild>
                            <Link to="/vendor/verification">Verify Now</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            <section className="relative overflow-hidden rounded-[28px] border border-border/60 gradient-wave p-6 md:p-8 shadow-card">
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_55%)]" />
                <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
                    <div className="space-y-4">
                        <Badge
                            variant="soft"
                            className="w-fit gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Vendor Control Room
                        </Badge>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                Welcome back, {user?.name?.split(" ")[0]}
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                                Track incoming demand, monitor earnings, and keep your profile moving with confidence.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="hero">
                                <Link to="/vendor/bookings">Manage Bookings</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/vendor/business-profile">Edit Business Profile</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Total earnings
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">
                                    {formatCurrency(paymentSummary.totalEarnings)}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {paymentSummary.growth >= 0 ? "+" : ""}
                                    {paymentSummary.growth}% vs last month
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Business health
                                </p>
                                <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-foreground">
                                    <BadgeCheck className="h-5 w-5 text-secondary" />
                                    {vendor?.verificationStatus === "verified" ? "Verified profile" : "Pending review"}
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {vendor?.packages.length || 0} packages live in your catalog
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Completed jobs
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{completedBookings}</p>
                                <p className="mt-1 text-sm text-muted-foreground">Strong signal for repeat trust</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardContent className="p-5">
                            <div
                                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${stat.color}`}
                            >
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Booking Pipeline</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            A status snapshot of all current requests and finished work.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={bookingPipelineOption} height={340} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Revenue Flow</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Monthly net movement built from incoming payments and refunds.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={revenueTrendOption} height={340} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Pending Requests</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                The newest requests waiting for your response.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/vendor/bookings">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {pendingBookings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                No pending requests right now.
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {pendingBookings.map((booking) => {
                                    const customerName = booking.customer?.name || booking.customerName || "Customer";
                                    const timeRange = booking.timeRange || { start: "--", end: "--" };
                                    const customerPhone = booking.customer?.phone || "";
                                    const customerEmail = booking.customer?.email || "";
                                    return (
                                        <Card key={booking._id} variant="interactive" className="border-dashed">
                                            <CardContent className="space-y-3 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-medium text-foreground">{customerName}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {booking.eventType || "Event"} •{" "}
                                                            {booking.packageName || "Package"}
                                                        </p>
                                                    </div>
                                                    <Badge variant="warning">pending</Badge>
                                                </div>

                                                <div className="grid gap-2 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>
                                                            {new Date(booking.date).toLocaleDateString("en-US", {
                                                                weekday: "short",
                                                                month: "short",
                                                                day: "numeric"
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
                                                        <span>{booking.location || "Location pending"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Package className="h-4 w-4" />
                                                        <span>{formatCurrency(booking.price || 0)}</span>
                                                    </div>
                                                </div>

                                                {(customerPhone || customerEmail) && (
                                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                                        {customerPhone && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Phone className="h-3.5 w-3.5" />
                                                                {customerPhone}
                                                            </span>
                                                        )}
                                                        {customerEmail && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <Mail className="h-3.5 w-3.5" />
                                                                {customerEmail}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="success"
                                                        onClick={() => handleDecision(booking._id, "ACCEPT")}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDecision(booking._id, "REJECT")}
                                                    >
                                                        Decline
                                                    </Button>
                                                    <Button size="sm" variant="ghost" asChild>
                                                        <Link to={`/vendor/bookings/${booking._id}`}>View</Link>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Money Movement</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            The latest credits and debits across your business.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <EChart option={recentTransactionOption} height={280} />
                        <div className="space-y-3">
                            {transactions.slice(0, 4).map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="flex items-center justify-between rounded-2xl border border-border/70 p-4"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{transaction.booking}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(transaction.date).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className={`font-semibold ${
                                                transaction.type === "debit" ? "text-destructive" : "text-secondary"
                                            }`}
                                        >
                                            {transaction.type === "debit" ? "-" : "+"}
                                            {formatCurrency(transaction.amount)}
                                        </p>
                                        <p className="text-sm capitalize text-muted-foreground">{transaction.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
