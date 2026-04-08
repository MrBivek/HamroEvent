import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Filter, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AdminService } from "@/services/AdminService";
import { getErrorMessage } from "@/lib/api";
import type { Report } from "@/types";

const STATUS_OPTIONS = [
    { label: "All Reports", value: "ALL" },
    { label: "Open", value: "OPEN" },
    { label: "Reviewed", value: "REVIEWED" },
    { label: "Resolved", value: "RESOLVED" }
];

export default function AdminReports() {
    const { toast } = useToast();
    const [reports, setReports] = useState<Report[]>([]);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setIsLoading(true);
            try {
                const res = await AdminService.getApiAdminReports({
                    status: statusFilter === "ALL" ? undefined : statusFilter,
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setReports(res?.items || []);
            } catch (error) {
                if (!active) return;
                setReports([]);
                toast({
                    title: "Failed to load reports",
                    description: getErrorMessage(error, "Please try again."),
                    variant: "destructive"
                });
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => {
            active = false;
        };
    }, [statusFilter, toast]);

    const counts = useMemo(
        () => ({
            open: reports.filter((report) => String(report.status || "OPEN").toUpperCase() === "OPEN").length,
            reviewed: reports.filter((report) => String(report.status).toUpperCase() === "REVIEWED").length,
            resolved: reports.filter((report) => String(report.status).toUpperCase() === "RESOLVED").length
        }),
        [reports]
    );

    const updateStatus = async (id: string, status: "OPEN" | "REVIEWED" | "RESOLVED") => {
        setUpdatingId(id);
        try {
            const updated = await AdminService.patchApiAdminReports({
                id,
                requestBody: { status }
            });
            setReports((prev) =>
                prev.map((report) =>
                    report._id === id ? { ...report, status: updated.status, updatedAt: updated.updatedAt } : report
                )
            );
            toast({ title: `Report marked as ${status.toLowerCase()}` });
        } catch (error) {
            toast({
                title: "Failed to update report",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusVariant = (status?: string) => {
        switch (String(status || "OPEN").toUpperCase()) {
            case "RESOLVED":
                return "success" as const;
            case "REVIEWED":
                return "soft-secondary" as const;
            default:
                return "warning" as const;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Reports</h1>
                    <p className="text-muted-foreground">
                        Review abuse and issue reports submitted by users across the platform.
                    </p>
                </div>
                <div className="w-full lg:w-[220px]">
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span>Status filter</span>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter reports" />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                    title="Open Reports"
                    value={counts.open}
                    caption="Needs admin attention"
                    icon={ShieldAlert}
                    tone="warning"
                />
                <SummaryCard
                    title="Reviewed"
                    value={counts.reviewed}
                    caption="Already looked into"
                    icon={Eye}
                    tone="secondary"
                />
                <SummaryCard
                    title="Resolved"
                    value={counts.resolved}
                    caption="Closed successfully"
                    icon={CheckCircle2}
                    tone="success"
                />
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <Card>
                        <CardContent className="p-6 text-sm text-muted-foreground">Loading reports...</CardContent>
                    </Card>
                ) : reports.length > 0 ? (
                    reports.map((report) => (
                        <Card key={report._id} className="overflow-hidden">
                            <CardHeader className="border-b border-border/60 bg-muted/20">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <CardTitle className="text-lg">
                                                {report.targetName || "Reported target"}
                                            </CardTitle>
                                            <Badge variant={getStatusVariant(report.status)}>
                                                {String(report.status || "OPEN").toLowerCase()}
                                            </Badge>
                                            <Badge variant="outline" className="capitalize">
                                                {report.targetType}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Reported by {report.reporterName || "User"} on{" "}
                                            {report.createdAt
                                                ? new Date(report.createdAt).toLocaleString()
                                                : "Unknown date"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={updatingId === report._id}
                                            onClick={() => updateStatus(report._id, "REVIEWED")}
                                        >
                                            Mark Reviewed
                                        </Button>
                                        <Button
                                            size="sm"
                                            disabled={updatingId === report._id}
                                            onClick={() => updateStatus(report._id, "RESOLVED")}
                                        >
                                            Resolve
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 p-5">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl border border-border/70 p-4">
                                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Reason
                                        </p>
                                        <p className="text-sm leading-6 text-foreground">{report.reason}</p>
                                    </div>
                                    <div className="rounded-2xl border border-border/70 p-4">
                                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                            Reference
                                        </p>
                                        <p className="text-sm text-foreground break-all">{report.targetId}</p>
                                        {report.updatedAt && (
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                Last updated: {new Date(report.updatedAt).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft/25 p-4 text-sm">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                                    <p className="text-muted-foreground">
                                        Review this complaint, verify the reported content, and then update the status
                                        once action is taken.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-10 text-center">
                            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                            <h3 className="text-lg font-semibold text-foreground">No reports found</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                There are no user-submitted reports for the selected filter right now.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    caption,
    icon: Icon,
    tone
}: {
    title: string;
    value: number;
    caption: string;
    icon: typeof ShieldAlert;
    tone: "warning" | "secondary" | "success";
}) {
    const toneClass =
        tone === "warning"
            ? "bg-warning-soft text-warning"
            : tone === "success"
              ? "bg-success-soft text-success"
              : "bg-secondary-soft text-secondary";

    return (
        <Card>
            <CardContent className="p-5">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
            </CardContent>
        </Card>
    );
}
