import { useEffect, useState, type SVGProps } from "react";
import {
    DollarSign,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Filter,
    Calendar,
    CreditCard,
    Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { motion } from "framer-motion";
import { VendorPaymentsService } from "@/services/VendorPaymentsService";
import { useToast } from "@/hooks/use-toast.ts";
import { getErrorMessage } from "@/lib/api";
import type { VendorPaymentSummary, VendorPaymentTransaction, VendorPayout } from "@/types";

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
    const [payouts, setPayouts] = useState<VendorPayout[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [summaryRes, txRes, payoutRes] = await Promise.all([
                    VendorPaymentsService.getApiVendorsMePaymentsSummary(),
                    VendorPaymentsService.getApiVendorsMePaymentsTransactions(),
                    VendorPaymentsService.getApiVendorsMePaymentsPayouts()
                ]);
                if (!active) return;
                setSummary(summaryRes || summary);
                setTransactions(txRes?.items || []);
                setPayouts(payoutRes?.items || []);
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
                setPayouts([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleRequestPayout = async () => {
        if (summary.availableBalance <= 0) return;
        try {
            await VendorPaymentsService.postApiVendorsMePaymentsPayouts({
                requestBody: { amount: summary.availableBalance, bankLast4: "1234" }
            });
            const payoutRes = await VendorPaymentsService.getApiVendorsMePaymentsPayouts();
            setPayouts(payoutRes?.items || []);
            toast({ title: "Payout requested", description: "Your payout request was submitted." });
        } catch (error) {
            toast({
                title: "Failed to request payout",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Payments</h1>
                    <p className="text-muted-foreground">Track your earnings and payouts</p>
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
                            <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center mb-3">
                                <Wallet className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {summary.availableBalance.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Available Balance</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="hover-lift">
                        <CardContent className="p-4">
                            <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center mb-3">
                                <Clock className="h-5 w-5 text-warning" />
                            </div>
                            <div className="text-2xl font-bold text-foreground">
                                NPR {summary.pendingPayout.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Pending Payout</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
            </div>

            {/* Payout Card */}
            <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-foreground mb-1">Request Payout</h3>
                            <p className="text-sm text-muted-foreground">
                                Withdraw your available balance to your bank account
                            </p>
                            <div className="mt-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CreditCard className="h-4 w-4" />
                                    <span>Bank Account ending in **** 1234</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-foreground mb-2">
                                NPR {summary.availableBalance.toLocaleString()}
                            </div>
                            <Button
                                variant="default"
                                onClick={handleRequestPayout}
                                disabled={summary.availableBalance <= 0}
                            >
                                Request Payout
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Transactions & Payouts */}
            <Tabs defaultValue="transactions">
                <TabsList>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="payouts">Payouts</TabsTrigger>
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

                <TabsContent value="payouts" className="mt-6 space-y-3">
                    {payouts.map((payout, index) => (
                        <motion.div
                            key={payout.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className="hover-lift">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-primary-soft flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Payout to {payout.bank}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(payout.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-foreground">
                                            NPR {payout.amount.toLocaleString()}
                                        </p>
                                        <Badge
                                            variant={payout.status === "completed" ? "success" : "warning"}
                                            className="capitalize"
                                        >
                                            {payout.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
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
