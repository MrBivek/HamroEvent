import { useEffect, useState } from "react";
import { FileText, User, Store, Star, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { AdminService } from "@/services/AdminService";
import type { AuditLog } from "@/types";

export default function AdminAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminAuditLogs({ page: 1, limit: 50 });
                if (!active) return;
                setLogs(res?.items || []);
            } catch {
                if (!active) return;
                setLogs([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);
    const getIcon = (type: string) => {
        switch (type) {
            case "vendor":
                return <Store className="h-4 w-4" />;
            case "user":
                return <User className="h-4 w-4" />;
            case "review":
                return <Star className="h-4 w-4" />;
            default:
                return <Shield className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
                <p className="text-muted-foreground">Track all administrative actions</p>
            </div>

            <Card>
                <CardContent className="p-0 divide-y divide-border">
                    {logs.map((log) => (
                        <div key={log._id} className="flex items-center gap-4 p-4">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                {getIcon(log.targetType || log.type)}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-foreground">{log.actionType || log.action}</p>
                                <p className="text-sm text-muted-foreground">
                                    {log.actorAdminId || "Admin"} • {log.targetType || log.targetId}
                                </p>
                            </div>
                            <div className="text-right">
                                <Badge variant="outline" className="capitalize">
                                    {log.targetType || log.type}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(log.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
