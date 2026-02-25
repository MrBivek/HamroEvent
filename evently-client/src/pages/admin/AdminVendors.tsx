import { useEffect, useMemo, useState } from "react";
import {
    Search,
    UserCheck,
    UserX,
    Mail,
    Phone,
    CalendarDays,
    Star,
    ShieldCheck,
    Building2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select.tsx";
import { AdminService } from "@/services/AdminService";
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import type { AdminVendorListItem } from "@/types";

export default function AdminVendors() {
    const [vendors, setVendors] = useState<AdminVendorListItem[]>([]);
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [total, setTotal] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminVendors({
                    q: query || undefined,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                    from: fromDate || undefined,
                    to: toDate || undefined,
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setVendors(res?.items || []);
                setTotal(res?.total || 0);
            } catch {
                if (!active) return;
                setVendors([]);
                setTotal(0);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [query, statusFilter, fromDate, toDate]);

    const handleToggle = async (vendor: AdminVendorListItem, isActive: boolean) => {
        try {
            await AdminService.patchApiAdminUsers({
                id: vendor.userId,
                requestBody: { isActive }
            });
            setVendors((prev) =>
                prev.map((v) => (v.vendorId === vendor.vendorId ? { ...v, status: isActive ? "active" : "suspended" } : v))
            );
            toast({
                title: isActive ? "Vendor activated" : "Vendor deactivated",
                description: isActive
                    ? "Vendor will appear in the marketplace."
                    : "Vendor will be hidden from customers."
            });
        } catch (error) {
            toast({
                title: "Update failed",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case "active":
                return "success";
            case "pending":
                return "warning";
            case "suspended":
                return "soft-destructive";
            default:
                return "outline";
        }
    };

    const activeFilters = useMemo(
        () =>
            [
                query.trim(),
                statusFilter !== "all",
                fromDate,
                toDate
            ].filter(Boolean).length,
        [query, statusFilter, fromDate, toDate]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Verified Vendors</h1>
                    <p className="text-muted-foreground">{total || vendors.length} verified vendors</p>
                </div>
                <div className="relative w-full lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search vendors..."
                        className="pl-10"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">From</p>
                        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">To</p>
                        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Visibility</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ShieldCheck className="h-4 w-4" />
                            Active vendors appear in the marketplace
                        </div>
                    </div>
                    {activeFilters > 0 && (
                        <div className="md:col-span-2 xl:col-span-4 flex items-center justify-between text-sm text-muted-foreground">
                            <p>{activeFilters} filter{activeFilters !== 1 ? "s" : ""} applied</p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setQuery("");
                                    setStatusFilter("all");
                                    setFromDate("");
                                    setToDate("");
                                }}
                            >
                                Clear filters
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {vendors.map((vendor) => (
                    <Card key={vendor.vendorId} className="hover-lift">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-lg font-semibold text-foreground">{vendor.businessName}</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Building2 className="h-4 w-4" />
                                        <span className="capitalize">{vendor.category || "service"}</span>
                                    </div>
                                </div>
                                <Badge variant={statusBadge(vendor.status)} className="capitalize">
                                    {vendor.status}
                                </Badge>
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{vendor.contactEmail}</span>
                                </div>
                                {vendor.contactPhone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <span>{vendor.contactPhone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>Joined {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : "—"}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {vendor.verificationStatus}
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    <Star className="h-3.5 w-3.5 text-warning" />
                                    {vendor.ratingAvg.toFixed(1)} ({vendor.ratingCount})
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {vendor.status === "active" ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => handleToggle(vendor, false)}
                                    >
                                        <UserX className="h-4 w-4 mr-1" />
                                        Deactivate
                                    </Button>
                                ) : (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleToggle(vendor, true)}
                                    >
                                        <UserCheck className="h-4 w-4 mr-1" />
                                        Activate
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
