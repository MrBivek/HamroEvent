import { useEffect, useState, type SVGProps } from "react";
import {
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Wallet
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import type { VendorPaymentConfig, VendorPaymentSummary, VendorPaymentTransaction } from "@/types";

export default function VendorPayments() {
    const [period, setPeriod] = useState("month");
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

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [summaryRes, txRes, configRes] = await Promise.all([
                    VendorPaymentsService.getApiVendorsMePaymentsSummary(),
                    VendorPaymentsService.getApiVendorsMePaymentsTransactions(),
                    VendorPaymentsService.getApiVendorsMePaymentsConfig()
                ]);
                if (!active) return;
                setSummary(summaryRes || summary);
                setTransactions(txRes?.items || []);
                setConfig(configRes || {});
                setConfigForm(configRes || {});
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
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const totalRefunds = transactions
        .filter((tx) => tx.type === "debit")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalPayments = transactions.filter((tx) => tx.type === "credit").length;

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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

            {/* Transactions & Payouts */}
            <Tabs defaultValue="transactions">
                <TabsList>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
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
