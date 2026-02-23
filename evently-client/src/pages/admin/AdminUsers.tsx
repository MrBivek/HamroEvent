import { useEffect, useState } from "react";
import { Search, MoreVertical, UserCheck, UserX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { AdminService } from "@/services/AdminService";
import { useToast } from "@/hooks/use-toast.ts";

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [query, setQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminUsers({ q: query || undefined, page: 1, limit: 50 });
                if (!active) return;
                setUsers(res?.items || []);
            } catch {
                if (!active) return;
                setUsers([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [query]);

    const handleToggle = async (id: string, isActive: boolean) => {
        try {
            await AdminService.patchApiAdminUsers({ id, requestBody: { isActive } });
            setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isActive } : u)));
        } catch (error: any) {
            toast({
                title: "Update failed",
                description: error?.body?.message || "Please try again.",
                variant: "destructive"
            });
        }
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                    <p className="text-muted-foreground">{users.length} users</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-10"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-border bg-muted/50">
                                <tr>
                                    <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                                    <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-muted/30">
                                        <td className="p-4">
                                            <div>
                                                <p className="font-medium text-foreground">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline" className="capitalize">
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={user.isActive ? "success" : "soft-destructive"}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon-sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleToggle(user._id, true)}>
                                                        <UserCheck className="h-4 w-4 mr-2" />
                                                        Activate
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => handleToggle(user._id, false)}
                                                    >
                                                        <UserX className="h-4 w-4 mr-2" />
                                                        Deactivate
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
