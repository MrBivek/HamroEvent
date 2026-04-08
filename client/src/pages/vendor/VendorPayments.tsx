import { useEffect, useState, type SVGProps } from "react";
import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Download, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { motion } from "framer-motion";
import { VendorPaymentsService } from "@/services/VendorPaymentsService";
import { CommissionPaymentsService } from "@/services/CommissionPaymentsService";
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import type {
    CommissionPaymentRecord,
    CommissionSummary,
    VendorPaymentConfig,
    VendorPaymentSummary,
    VendorPaymentTransaction
} from "@/types";

export default function VendorPayments() {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const [period, setPeriod] = useState("month");
    const [commissionMonth, setCommissionMonth] = useState(currentMonthKey);
    const { toast } = useToast();
    const [summary, setSummary] = useState<VendorPaymentSummary>({
        totalEarnings: 0,
        pendingPayout: 0,
        availableBalance: 0,
        thisMonth: 0,
        growth: 0
    });
    const [transactions, setTransactions] = useState<VendorPaymentTransaction[]>([]);
    const [config, setConfig] = useState<VendorPaymentConfig>({});
    const [configForm, setConfigForm] = useState<VendorPaymentConfig>({});
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [commissionSummary, setCommissionSummary] = useState<CommissionSummary>({
        monthKey: currentMonthKey,
        year: Number(currentMonthKey.slice(0, 4)),
        month: Number(currentMonthKey.slice(5, 7)),
        commissionRate: 0.1,
        grossEarnings: 0,
        refundsAmount: 0,
        netEarnings: 0,
        commissionDue: 0,
        commissionPaid: 0,
        commissionReserved: 0,
        commissionOutstanding: 0
    });
    const [commissionPayments, setCommissionPayments] = useState<CommissionPaymentRecord[]>([]);
    const [commissionAmount, setCommissionAmount] = useState("");
    const [commissionProvider, setCommissionProvider] = useState("KHALTI");
    const [isPayingCommission, setIsPayingCommission] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [summaryRes, txRes, configRes, commissionSummaryRes, commissionPaymentsRes] = await Promise.all([
                    VendorPaymentsService.getApiVendorsMePaymentsSummary(),
                    VendorPaymentsService.getApiVendorsMePaymentsTransactions(),
                    VendorPaymentsService.getApiVendorsMePaymentsConfig(),
                    CommissionPaymentsService.getApiVendorsMeCommissionsSummary(commissionMonth),
                    CommissionPaymentsService.getApiVendorsMeCommissionsPayments({
                        month: commissionMonth,
                        page: 1,
                        limit: 20
                    })
                ]);
                if (!active) return;
                setSummary(
                    summaryRes || {
                        totalEarnings: 0,
                        pendingPayout: 0,
                        availableBalance: 0,
                        thisMonth: 0,
                        growth: 0
                    }
                );
                setTransactions(txRes?.items || []);
                setConfig(configRes || {});
                setConfigForm(configRes || {});
                setCommissionSummary(commissionSummaryRes || commissionSummary);
                setCommissionPayments(commissionPaymentsRes?.items || []);
                setCommissionAmount(
                    String(
                        Math.max(
                            (commissionSummaryRes?.commissionOutstanding || 0) -
                                Math.max(
                                    (commissionSummaryRes?.commissionReserved || 0) -
                                        (commissionSummaryRes?.commissionPaid || 0),
                                    0
                                ),
                            0
                        )
                    )
                );
            } catch {
                if (!active) return;
                setSummary({
                    totalEarnings: 0,
                    pendingPayout: 0,
                    availableBalance: 0,
                    thisMonth: 0,
                    growth: 0
                });
                setTransactions([]);
                setConfig({});
                setConfigForm({});
                setCommissionPayments([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [commissionMonth]);

    const totalRefunds = transactions
        .filter((tx) => tx.type === "debit")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalPayments = transactions.filter((tx) => tx.type === "credit").length;
    const commissionRemaining = Math.max(
        commissionSummary.commissionOutstanding -
            Math.max(commissionSummary.commissionReserved - commissionSummary.commissionPaid, 0),
        0
    );

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        try {
            const saved = await VendorPaymentsService.putApiVendorsMePaymentsConfig({
                requestBody: configForm
            });
            setConfig(saved || {});
            setConfigForm(saved || {});
            toast({ title: "Payment settings saved" });
        } catch (error) {
            toast({
                title: "Failed to save settings",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsSavingConfig(false);
        }
    };

    const openProviderFlow = (payUrl?: string, formData?: Record<string, string>) => {
        if (formData && payUrl) {
            const form = document.createElement("form");
            form.method = "POST";
            form.action = payUrl;
            Object.entries(formData).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
            return;
        }

        if (payUrl) {
            window.open(payUrl, "_blank");
        }
    };

    const handlePayCommission = async () => {
        const amount = Number(commissionAmount);
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            toast({ title: "Enter a valid amount", variant: "destructive" });
            return;
        }
        if (amount > commissionRemaining) {
            toast({
                title: "Amount exceeds due commission",
                description: `Remaining payable commission is NPR ${commissionRemaining.toLocaleString()}.`,
                variant: "destructive"
            });
            return;
        }

        setIsPayingCommission(true);
        try {
            const response = await CommissionPaymentsService.postApiVendorsMeCommissionsPaymentsInitiate({
                requestBody: {
                    month: commissionMonth,
                    amount,
                    provider: commissionProvider
                }
            });
            openProviderFlow(response.payUrl, response.formData);
            toast({
                title: "Commission payment started",
                description: "Complete the payment in the opened window."
            });
        } catch (error) {
            toast({
                title: "Failed to start commission payment",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsPayingCommission(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payments</h1>
                    <p className="text-muted-foreground">Track your earnings and payments</p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">This Week</SelectItem>
                            <SelectItem value="month">This Month</SelectItem>
                            <SelectItem value="year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
                    <Card className="hover-lift">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-lg bg-success-soft flex items-center justify-center">
                                    <DollarSign className="h-5 w-5 text-success" />
                                </div>
                                <div className="flex items-center gap-1 text-success text-sm">
                                    <ArrowUpRight className="h-3 w-3" />
                                    <span>{summary.growth}%</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {summary.totalEarnings.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Earnings</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="hover-lift">
                        <CardContent className="p-4">
                            <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center mb-3">
                                <TrendingUp className="h-5 w-5 text-accent" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {summary.thisMonth.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">This Month</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="hover-lift">
                        <CardContent className="p-4">
                            <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center mb-3">
                                <Wallet className="h-5 w-5 text-warning" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {totalRefunds.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Refunds</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="hover-lift">
                        <CardContent className="p-4">
                            <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center mb-3">
                                <ArrowDownRight className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">{totalPayments}</div>
                            <div className="text-sm text-muted-foreground">Payments Received</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="hover-lift border-warning/30">
                        <CardContent className="p-4">
                            <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center mb-3">
                                <Wallet className="h-5 w-5 text-warning" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {(summary.monthlyCommissionOutstanding || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Commission Due</div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Transactions & Payouts */}
            <Tabs defaultValue="transactions">
                <TabsList>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="commission">Commission</TabsTrigger>
                    <TabsTrigger value="settings">Payment Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="mt-6 space-y-3">
                    {transactions.map((tx, index) => (
                        <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="hover-lift">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                                tx.type === "credit" ? "bg-success-soft" : "bg-destructive/10"
                                            }`}
                                        >
                                            {tx.type === "credit" ? (
                                                <ArrowDownRight className="h-5 w-5 text-success" />
                                            ) : (
                                                <ArrowUpRight className="h-5 w-5 text-destructive" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{tx.booking}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(tx.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className={`font-bold ${tx.type === "credit" ? "text-success" : "text-destructive"}`}
                                        >
                                            {tx.type === "credit" ? "+" : "-"} NPR {tx.amount.toLocaleString()}
                                        </p>
                                        <Badge
                                            variant={tx.status === "completed" ? "success" : "warning"}
                                            className="capitalize"
                                        >
                                            {tx.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </TabsContent>

                <TabsContent value="commission" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-lg">Monthly Commission</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    10% of your net monthly earnings is payable to admin.
                                </p>
                            </div>
                            <div className="w-full sm:w-[220px]">
                                <Label htmlFor="commissionMonth">Month</Label>
                                <Input
                                    id="commissionMonth"
                                    type="month"
                                    value={commissionMonth}
                                    onChange={(e) => setCommissionMonth(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-2xl border border-border/70 p-4">
                                    <p className="text-sm text-muted-foreground">Gross earnings</p>
                                    <p className="mt-2 text-2xl font-semibold">
                                        NPR {commissionSummary.grossEarnings.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border/70 p-4">
                                    <p className="text-sm text-muted-foreground">Refunds</p>
                                    <p className="mt-2 text-2xl font-semibold">
                                        NPR {commissionSummary.refundsAmount.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-border/70 p-4">
                                    <p className="text-sm text-muted-foreground">Net earnings</p>
                                    <p className="mt-2 text-2xl font-semibold">
                                        NPR {commissionSummary.netEarnings.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-warning/40 bg-warning-soft/30 p-4">
                                    <p className="text-sm text-muted-foreground">Outstanding</p>
                                    <p className="mt-2 text-2xl font-semibold">
                                        NPR {commissionRemaining.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                <div className="rounded-2xl border border-border/70 p-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-foreground">Commission history</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Payments made for {commissionMonth}
                                            </p>
                                        </div>
                                        <Badge variant="soft">
                                            Rate {(commissionSummary.commissionRate * 100).toFixed(0)}%
                                        </Badge>
                                    </div>

                                    <div className="space-y-3">
                                        {commissionPayments.length > 0 ? (
                                            commissionPayments.map((payment) => (
                                                <div
                                                    key={payment._id}
                                                    className="flex items-center justify-between rounded-xl border border-border/60 p-3"
                                                >
                                                    <div>
                                                        <p className="font-medium text-foreground">
                                                            {payment.provider} commission payment
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {payment.monthKey} •{" "}
                                                            {new Date(
                                                                payment.paidAt || payment.createdAt || ""
                                                            ).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold text-foreground">
                                                            NPR {payment.amount.toLocaleString()}
                                                        </p>
                                                        <Badge
                                                            variant={
                                                                String(payment.status).toUpperCase() === "PAID"
                                                                    ? "success"
                                                                    : "soft"
                                                            }
                                                        >
                                                            {String(payment.status).toLowerCase()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                No commission payments for this month yet.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border/70 p-4 space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-foreground">Pay admin commission</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Pay part or all of the outstanding monthly commission.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Amount (NPR)</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={commissionAmount}
                                            onChange={(e) => setCommissionAmount(e.target.value)}
                                            placeholder="Enter amount"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Provider</Label>
                                        <Select value={commissionProvider} onValueChange={setCommissionProvider}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose provider" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="KHALTI">Khalti</SelectItem>
                                                <SelectItem value="ESEWA">eSewa</SelectItem>
                                                <SelectItem value="MOCK">Mock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Commission due</span>
                                            <span className="font-medium">
                                                NPR {commissionSummary.commissionDue.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-muted-foreground">Already paid</span>
                                            <span className="font-medium">
                                                NPR {commissionSummary.commissionPaid.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-muted-foreground">Available to pay now</span>
                                            <span className="font-medium">
                                                NPR {commissionRemaining.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={handlePayCommission}
                                        disabled={isPayingCommission || commissionRemaining <= 0}
                                    >
                                        {isPayingCommission ? "Starting payment..." : "Pay Commission"}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Provider Keys</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">Khalti</h3>
                                    <Badge variant="soft">{config.khalti?.mode === "live" ? "Live" : "Sandbox"}</Badge>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
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
                                            placeholder="Khalti public key"
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
                                            placeholder="Khalti secret key"
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

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-foreground">eSewa</h3>
                                    <Badge variant="soft">{config.esewa?.mode === "live" ? "Live" : "Sandbox"}</Badge>
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
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
                                            placeholder="eSewa merchant code"
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
                                            placeholder="eSewa secret key"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mode</Label>
                                        <Select
                                            value={configForm.esewa?.mode || "sandbox"}
                                            onValueChange={(value) =>
                                                setConfigForm((prev) => ({
                                                    ...prev,
                                                    esewa: { ...(prev.esewa || {}), mode: value as "sandbox" | "live" }
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

                            <div className="flex justify-end">
                                <Button onClick={handleSaveConfig} disabled={isSavingConfig}>
                                    {isSavingConfig ? "Saving..." : "Save Settings"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Clock(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}
