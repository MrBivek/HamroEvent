import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Eye, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AdminService } from "@/services/AdminService";
import { getErrorMessage } from "@/lib/api";
import type { VerificationRequest } from "@/types";

export default function AdminPendingVendors() {
    const { toast } = useToast();
    const [pendingVendors, setPendingVendors] = useState<VerificationRequest[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminVerificationRequests({
                    status: "PENDING",
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setPendingVendors(res?.items || []);
            } catch {
                if (!active) return;
                setPendingVendors([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleApprove = async (id: string, name: string) => {
        try {
            await AdminService.patchApiAdminVerificationRequestsDecision({
                id,
                requestBody: { decision: "APPROVE" }
            });
            setPendingVendors((prev) => prev.filter((v) => v._id !== id));
            toast({ title: "Vendor approved", description: `${name} is now verified.` });
        } catch (error) {
            toast({
                title: "Failed to approve",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleReject = async (id: string, name: string) => {
        try {
            await AdminService.patchApiAdminVerificationRequestsDecision({
                id,
                requestBody: { decision: "REJECT" }
            });
            setPendingVendors((prev) => prev.filter((v) => v._id !== id));
            toast({ title: "Vendor rejected", description: `${name} has been notified.`, variant: "destructive" });
        } catch (error) {
            toast({
                title: "Failed to reject",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Pending Verifications</h1>
                <p className="text-muted-foreground">{pendingVendors.length} vendors awaiting review</p>
            </div>

            <div className="space-y-4">
                {pendingVendors.map((request) => {
                    const vendor = request.vendor || {};
                    const requestId = String(request._id || request.id);
                    return (
                        <Card key={requestId}>
                            <CardContent className="p-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-foreground">
                                                {vendor.businessName || "Vendor"}
                                            </h3>
                                            <Badge variant="soft">{vendor.category || "service"}</Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {vendor.location || "—"}
                                            </span>
                                            <span>
                                                Submitted:{" "}
                                                {new Date(
                                                    request.submittedAt || request.createdAt
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>{request.documentsCount || 0} documents</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            Review
                                        </Button>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleApprove(requestId, vendor.businessName || "Vendor")}
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() => handleReject(requestId, vendor.businessName || "Vendor")}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
