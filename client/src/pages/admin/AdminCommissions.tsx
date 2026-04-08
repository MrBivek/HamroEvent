import { useEffect, useState } from "react";
import { CreditCard, Landmark, PercentCircle, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import { AdminPaymentsService } from "@/services/AdminPaymentsService.ts";
import type { AdminCommissionSummary, AdminPaymentConfig, CommissionPaymentRecord } from "@/types";

const currentMonthKey = new Date().toISOString().slice(0, 7);

export default function AdminCommissions() {
    const { toast } = useToast();
    const [month, setMonth] = useState(currentMonthKey);
    const [summary, setSummary] = useState<AdminCommissionSummary>({
        monthKey: currentMonthKey,
        commissionRate: 0.1,
        grossEarnings: 0,
        refundsAmount: 0,
        netEarnings: 0,
        commissionDue: 0,
        commissionPaid: 0,
        commissionOutstanding: 0,
        vendors: []
    });
    const [payments, setPayments] = useState<CommissionPaymentRecord[]>([]);
    const [config, setConfig] = useState<AdminPaymentConfig>({});
    const [configForm, setConfigForm] = useState<AdminPaymentConfig>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [summaryRes, paymentsRes, configRes] = await Promise.all([
                    AdminPaymentsService.getApiAdminCommissionsSummary(month),
                    AdminPaymentsService.getApiAdminCommissionsPayments({ month, page: 1, limit: 20 }),
                    AdminPaymentsService.getApiAdminPaymentsConfig()
                ]);
                if (!active) return;
                setSummary(summaryRes || summary);
                setPayments(paymentsRes?.items || []);
                setConfig(configRes || {});
                setConfigForm(configRes || {});
            } catch (error) {
                if (!active) return;
                toast({
                    title: "Failed to load commissions",
                    description: getErrorMessage(error, "Please try again."),
                    variant: "destructive"
                });
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [month, toast]);

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const saved = await AdminPaymentsService.putApiAdminPaymentsConfig({ requestBody: configForm });
            setConfig(saved || {});
            setConfigForm(saved || {});
            toast({ title: "Admin payment settings saved" });
        } catch (error) {
            toast({
                title: "Failed to save settings",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
                    <p className="text-muted-foreground">
                        Track vendor commission collections and manage admin gateway keys.
                    </p>
                </div>
                <div className="w-full sm:w-[220px]">
                    <Label htmlFor="month">Month</Label>
                    <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <StatCard
                    title="Gross Vendor Earnings"
                    value={`NPR ${summary.grossEarnings.toLocaleString()}`}
                    icon={Wallet}
                />
                <StatCard title="Net Earnings" value={`NPR ${summary.netEarnings.toLocaleString()}`} icon={Landmark} />
                <StatCard
                    title="Commission Due"
                    value={`NPR ${summary.commissionDue.toLocaleString()}`}
                    icon={PercentCircle}
                />
                <StatCard
                    title="Collected"
                    value={`NPR ${summary.commissionPaid.toLocaleString()}`}
                    icon={CreditCard}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Vendor Commission Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {summary.vendors.length > 0 ? (
                            summary.vendors.map((vendor) => (
                                <div
                                    key={`${vendor.vendorId}-${vendor.monthKey}`}
                                    className="rounded-2xl border border-border/70 p-4"
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="font-semibold text-foreground">{vendor.businessName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Net NPR {vendor.netEarnings.toLocaleString()} • Due NPR{" "}
                                                {vendor.commissionDue.toLocaleString()}
                                            </p>
                                        </div>
                                        <Badge variant={vendor.commissionOutstanding > 0 ? "warning" : "success"}>
                                            {vendor.commissionOutstanding > 0
                                                ? `Outstanding NPR ${vendor.commissionOutstanding.toLocaleString()}`
                                                : "Fully paid"}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No vendor earnings for this month yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Admin Gateway Keys</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">Khalti</h3>
                                <Badge variant="soft">{config.khalti?.mode === "live" ? "Live" : "Sandbox"}</Badge>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Public Key</Label>
                                    <Input
                                        type="password"
                                        value={configForm.khalti?.publicKey || ""}
                                        onChange={(e) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                khalti: { ...(prev.khalti || {}), publicKey: e.target.value }
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Secret Key</Label>
                                    <Input
                                        type="password"
                                        value={configForm.khalti?.secretKey || ""}
                                        onChange={(e) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                khalti: { ...(prev.khalti || {}), secretKey: e.target.value }
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mode</Label>
                                    <Select
                                        value={configForm.khalti?.mode || "sandbox"}
                                        onValueChange={(value) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                khalti: {
                                                    ...(prev.khalti || {}),
                                                    mode: value as "sandbox" | "live"
                                                }
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Sandbox</SelectItem>
                                            <SelectItem value="live">Live</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground">eSewa</h3>
                                <Badge variant="soft">{config.esewa?.mode === "live" ? "Live" : "Sandbox"}</Badge>
                            </div>
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label>Merchant Code</Label>
                                    <Input
                                        type="password"
                                        value={configForm.esewa?.merchantCode || ""}
                                        onChange={(e) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                esewa: { ...(prev.esewa || {}), merchantCode: e.target.value }
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Secret Key</Label>
                                    <Input
                                        type="password"
                                        value={configForm.esewa?.secretKey || ""}
                                        onChange={(e) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                esewa: { ...(prev.esewa || {}), secretKey: e.target.value }
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mode</Label>
                                    <Select
                                        value={configForm.esewa?.mode || "sandbox"}
                                        onValueChange={(value) =>
                                            setConfigForm((prev) => ({
                                                ...prev,
                                                esewa: {
                                                    ...(prev.esewa || {}),
                                                    mode: value as "sandbox" | "live"
                                                }
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="sandbox">Sandbox</SelectItem>
                                            <SelectItem value="live">Live</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full">
                            {isSaving ? "Saving..." : "Save Admin Payment Settings"}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Commission Payment History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {payments.length > 0 ? (
                        payments.map((payment) => (
                            <div
                                key={payment._id}
                                className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{payment.vendorName || "Vendor"}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {payment.monthKey} • {payment.provider} •{" "}
                                        {new Date(payment.paidAt || payment.createdAt || "").toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">
                                        NPR {payment.amount.toLocaleString()}
                                    </p>
                                    <Badge
                                        variant={String(payment.status).toUpperCase() === "PAID" ? "success" : "soft"}
                                    >
                                        {String(payment.status).toLowerCase()}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No commission payments for this month yet.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Wallet }) {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
            </CardContent>
        </Card>
    );
}
