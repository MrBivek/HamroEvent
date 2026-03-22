import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { EChartsOption } from "echarts";
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    FileWarning,
    ShieldCheck,
    Sparkles,
    Star,
    Store,
    TrendingUp,
    Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { EChart, getChartColor } from "@/components/charts/EChart.tsx";
import { AdminService } from "@/services/AdminService";
import type {
    AdminAnalyticsResponse,
    AdminDashboardPendingVendor,
    AdminDashboardStats,
    AdminVendorListItem,
    Report,
    User
} from "@/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminDashboardStats>({
        totalUsers: 0,
        activeVendors: 0,
        totalBookings: 0,
        avgRating: 0
    });
    const [pendingVendors, setPendingVendors] = useState<AdminDashboardPendingVendor[]>([]);
    const [analytics, setAnalytics] = useState<AdminAnalyticsResponse>({
        bookingsByCategory: [],
        monthlyBookings: Array.from({ length: 12 }, () => 0)
    });
    const [users, setUsers] = useState<User[]>([]);
    const [vendors, setVendors] = useState<AdminVendorListItem[]>([]);
    const [reports, setReports] = useState<Report[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [dashboardRes, analyticsRes, usersRes, vendorsRes, reportsRes] = await Promise.all([
                    AdminService.getApiAdminDashboard(),
                    AdminService.getApiAdminAnalytics(),
                    AdminService.getApiAdminUsers({ page: 1, limit: 100 }),
                    AdminService.getApiAdminVendors({ page: 1, limit: 100 }),
                    AdminService.getApiAdminReports({ page: 1, limit: 100 })
                ]);
                if (!active) return;
                setStats(dashboardRes?.stats || stats);
                setPendingVendors(dashboardRes?.pendingVendors || []);
                setAnalytics(analyticsRes || analytics);
                setUsers(usersRes?.items || []);
                setVendors(vendorsRes?.items || []);
                setReports(reportsRes?.items || []);
            } catch {
                if (!active) return;
                setPendingVendors([]);
                setUsers([]);
                setVendors([]);
                setReports([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const pendingReports = reports.filter((report) => (report.status || "pending").toLowerCase() === "pending").length;
    const suspendedUsers = users.filter((user) => user.status === "suspended").length;
    const averageVendorRating =
        vendors.length > 0 ? vendors.reduce((sum, vendor) => sum + (vendor.ratingAvg || 0), 0) / vendors.length : 0;

    const statCards = [
        {
            label: "Total users",
            value: stats.totalUsers,
            icon: Users,
            color: "bg-primary-soft text-primary"
        },
        {
            label: "Active vendors",
            value: stats.activeVendors,
            icon: Store,
            color: "bg-secondary-soft text-secondary"
        },
        {
            label: "Pending reports",
            value: pendingReports,
            icon: FileWarning,
            color: "bg-destructive-soft text-destructive"
        },
        {
            label: "Avg vendor rating",
            value: averageVendorRating.toFixed(1),
            icon: Star,
            color: "bg-warning-soft text-warning"
        }
    ];

    const monthlyBookingOption: EChartsOption = {
        animationDuration: 700,
        tooltip: {
            trigger: "axis",
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
            boundaryGap: false,
            data: MONTH_LABELS,
            axisLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb") } },
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") }
        },
        yAxis: {
            type: "value",
            axisLabel: { color: getChartColor("--muted-foreground", "#6b7280") },
            splitLine: { lineStyle: { color: getChartColor("--border", "#e5e7eb"), opacity: 0.6 } }
        },
        series: [
            {
                type: "line",
                smooth: true,
                symbolSize: 8,
                data: analytics.monthlyBookings,
                lineStyle: { width: 3, color: getChartColor("--primary", "#6366f1") },
                itemStyle: { color: getChartColor("--primary", "#6366f1") },
                areaStyle: {
                    color: getChartColor("--primary-soft", "#eef2ff")
                }
            }
        ]
    };

    const categoryMixOption: EChartsOption = {
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
                label: { show: false },
                itemStyle: {
                    borderRadius: 14,
                    borderColor: getChartColor("--card", "#ffffff"),
                    borderWidth: 4
                },
                data: analytics.bookingsByCategory.map((item, index) => ({
                    value: item.count,
                    name: item.category,
                    itemStyle: {
                        color: [
                            getChartColor("--primary", "#6366f1"),
                            getChartColor("--secondary", "#14b8a6"),
                            getChartColor("--accent", "#f97316"),
                            getChartColor("--warning", "#f59e0b"),
                            getChartColor("--success", "#22c55e")
                        ][index % 5]
                    }
                }))
            }
        ]
    };

    const userRoleOption: EChartsOption = {
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
            bottom: 16,
            containLabel: true
        },
        xAxis: {
            type: "category",
            data: ["Customers", "Vendors", "Admins"],
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
                barWidth: 28,
                data: [
                    users.filter((user) => user.role === "customer").length,
                    users.filter((user) => user.role === "vendor").length,
                    users.filter((user) => user.role === "admin").length
                ],
                itemStyle: {
                    borderRadius: [12, 12, 0, 0],
                    color: getChartColor("--secondary", "#14b8a6")
                }
            }
        ]
    };

    const reportStatusOption: EChartsOption = {
        animationDuration: 700,
        tooltip: {
            trigger: "item",
            backgroundColor: getChartColor("--card", "#ffffff"),
            borderColor: getChartColor("--border", "#e5e7eb"),
            textStyle: {
                color: getChartColor("--foreground", "#111827")
            }
        },
        series: [
            {
                type: "pie",
                radius: ["45%", "72%"],
                center: ["50%", "48%"],
                label: { show: false },
                itemStyle: {
                    borderRadius: 14,
                    borderColor: getChartColor("--card", "#ffffff"),
                    borderWidth: 4
                },
                data: ["pending", "reviewed", "resolved"].map((status, index) => ({
                    value: reports.filter((report) => (report.status || "pending").toLowerCase() === status).length,
                    name: status,
                    itemStyle: {
                        color: [
                            getChartColor("--warning", "#f59e0b"),
                            getChartColor("--primary", "#6366f1"),
                            getChartColor("--success", "#22c55e")
                        ][index]
                    }
                }))
            }
        ]
    };

    return (
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-border/60 gradient-wave p-6 md:p-8 shadow-card">
                <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_55%)]" />
                <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                    <div className="space-y-4">
                        <Badge
                            variant="soft"
                            className="w-fit gap-2 rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.18em]"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Admin Radar
                        </Badge>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                Platform dashboard
                            </h1>
                            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                                Keep one eye on marketplace growth and the other on governance. This view surfaces
                                demand, moderation pressure, and vendor health in one place.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button asChild variant="hero">
                                <Link to="/admin/vendors/pending">Review Vendors</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/admin/reports">Open Reports</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Trust queue</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{pendingVendors.length}</p>
                                <p className="mt-1 text-sm text-muted-foreground">vendors waiting for verification</p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Risk watch</p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{pendingReports}</p>
                                <p className="mt-1 text-sm text-muted-foreground">reports still need attention</p>
                            </CardContent>
                        </Card>
                        <Card className="border-white/40 bg-white/70 backdrop-blur dark:bg-card/70">
                            <CardContent className="p-4">
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                    Suspended users
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-foreground">{suspendedUsers}</p>
                                <p className="mt-1 text-sm text-muted-foreground">accounts currently restricted</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {statCards.map((stat) => (
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

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Bookings Through The Year</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Monthly booking creation volume for the current year.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={monthlyBookingOption} height={340} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Demand By Category</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Which vendor categories are seeing the highest booking share.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={categoryMixOption} height={340} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Account Distribution</CardTitle>
                        <p className="text-sm text-muted-foreground">Role mix across the platform right now.</p>
                    </CardHeader>
                    <CardContent>
                        <EChart option={userRoleOption} height={300} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Report Resolution Mix</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            The moderation queue split by its current state.
                        </p>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
                        <EChart option={reportStatusOption} height={280} />
                        <div className="space-y-3">
                            {[
                                {
                                    label: "Pending",
                                    value: reports.filter(
                                        (report) => (report.status || "pending").toLowerCase() === "pending"
                                    ).length,
                                    icon: AlertCircle,
                                    tone: "text-warning"
                                },
                                {
                                    label: "Reviewed",
                                    value: reports.filter(
                                        (report) => (report.status || "").toLowerCase() === "reviewed"
                                    ).length,
                                    icon: ShieldCheck,
                                    tone: "text-primary"
                                },
                                {
                                    label: "Resolved",
                                    value: reports.filter(
                                        (report) => (report.status || "").toLowerCase() === "resolved"
                                    ).length,
                                    icon: CheckCircle2,
                                    tone: "text-success"
                                }
                            ].map((item) => (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between rounded-2xl border border-border/70 p-4"
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={`h-5 w-5 ${item.tone}`} />
                                        <span className="font-medium text-foreground">{item.label}</span>
                                    </div>
                                    <span className="text-lg font-semibold text-foreground">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Pending Verifications</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                The most recent vendor submissions waiting on admin review.
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link to="/admin/vendors/pending">
                                View All <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingVendors.length > 0 ? (
                            pendingVendors.slice(0, 5).map((vendor) => (
                                <div
                                    key={vendor.id}
                                    className="flex items-center justify-between rounded-2xl border border-border/70 p-4"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">{vendor.name}</p>
                                        <p className="text-sm text-muted-foreground">{vendor.category}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="success" asChild>
                                            <Link to="/admin/vendors/pending">
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link to="/admin/vendors/pending">Review</Link>
                                        </Button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                                No vendors are waiting for review.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                        <p className="text-sm text-muted-foreground">Shortcuts into the main governance workflows.</p>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="h-auto py-5 flex-col gap-2" asChild>
                            <Link to="/admin/vendors/pending">
                                <Store className="h-6 w-6" />
                                <span>Verify Vendors</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-5 flex-col gap-2" asChild>
                            <Link to="/admin/users">
                                <Users className="h-6 w-6" />
                                <span>Manage Users</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-5 flex-col gap-2" asChild>
                            <Link to="/admin/reviews">
                                <Star className="h-6 w-6" />
                                <span>Moderate Reviews</span>
                            </Link>
                        </Button>
                        <Button variant="outline" className="h-auto py-5 flex-col gap-2" asChild>
                            <Link to="/admin/reports">
                                <TrendingUp className="h-6 w-6" />
                                <span>View Reports</span>
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
