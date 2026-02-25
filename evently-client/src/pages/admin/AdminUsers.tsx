import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck, UserX, Mail, Phone, CalendarDays, ShieldCheck, Users, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { AdminService } from "@/services/AdminService";
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import type { User } from "@/types";

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [query, setQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [total, setTotal] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminUsers({
                    q: query || undefined,
                    role: roleFilter !== "all" ? roleFilter : undefined,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                    from: fromDate || undefined,
                    to: toDate || undefined,
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setUsers(res?.items || []);
                setTotal(res?.total || 0);
            } catch {
                if (!active) return;
                setUsers([]);
                setTotal(0);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [query, roleFilter, statusFilter, fromDate, toDate]);

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await AdminService.patchApiAdminUsers({ id, requestBody: { isActive } });
            setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isActive } : u)));
        } catch (error) {
            toast({
                title: "Update failed",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const openDetails = (user: User) => {
        setSelectedUser(user);
        setIsDetailsOpen(true);
    };

    const getAccountStatus = (user: User) => {
        if (user.status) return user.status;
        return user.isActive ? "active" : "suspended";
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

    const verificationLabel = (user: User) => {
        if (user.role !== "vendor") return "N/A";
        return user.verificationStatus || "pending";
    };

    const activeFilters = useMemo(
        () => [query.trim(), roleFilter !== "all", statusFilter !== "all", fromDate, toDate].filter(Boolean).length,
        [query, roleFilter, statusFilter, fromDate, toDate]
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-muted-foreground">{total || users.length} users</p>
                </div>
                <div className="relative w-full lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or email..."
                        className="pl-10"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All roles" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="vendor">Vendor</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
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
                    {activeFilters > 0 && (
                        <div className="md:col-span-2 xl:col-span-4 flex items-center justify-between text-sm text-muted-foreground">
                            <p>
                                {activeFilters} filter{activeFilters !== 1 ? "s" : ""} applied
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setQuery("");
                                    setRoleFilter("all");
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
                {users.map((user) => {
                    const accountStatus = getAccountStatus(user);
                    return (
                        <Card key={user._id} className="hover-lift">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-lg font-semibold text-foreground">{user.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <span>{user.email}</span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                        {user.role}
                                    </Badge>
                                </div>

                                <div className="grid gap-2 text-sm text-muted-foreground">
                                    {user.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            <span>{user.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4" />
                                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={statusBadge(accountStatus)} className="capitalize">
                                        {accountStatus}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize flex items-center gap-1">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        {verificationLabel(user)}
                                    </Badge>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openDetails(user)}>
                                        <Users className="h-4 w-4 mr-1" />
                                        View Details
                                    </Button>
                                    {user.isActive ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() => handleToggle(user._id, false)}
                                        >
                                            <UserX className="h-4 w-4 mr-1" />
                                            Deactivate
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleToggle(user._id, true)}
                                        >
                                            <UserCheck className="h-4 w-4 mr-1" />
                                            Activate
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-primary-soft flex items-center justify-center">
                                    <BadgeCheck className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-foreground">{selectedUser.name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="grid gap-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{selectedUser.email}</span>
                                </div>
                                {selectedUser.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        <span>{selectedUser.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>Joined {new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="capitalize">
                                    {selectedUser.role}
                                </Badge>
                                <Badge variant={statusBadge(getAccountStatus(selectedUser))} className="capitalize">
                                    {getAccountStatus(selectedUser)}
                                </Badge>
                                <Badge variant="outline" className="capitalize flex items-center gap-1">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    {verificationLabel(selectedUser)}
                                </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectedUser.isActive ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => handleToggle(selectedUser._id, false)}
                                    >
                                        <UserX className="h-4 w-4 mr-1" />
                                        Deactivate
                                    </Button>
                                ) : (
                                    <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleToggle(selectedUser._id, true)}
                                    >
                                        <UserCheck className="h-4 w-4 mr-1" />
                                        Activate
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
