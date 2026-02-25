import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { AuthService } from "@/services/AuthService";
import { getErrorMessage } from "@/lib/api";

export default function OtpVerificationPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const prefill = searchParams.get("email");
        if (prefill) setEmail(prefill);
    }, [searchParams]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !otp) {
            toast({ title: "Please fill all fields", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await AuthService.postApiAuthVerifyOtp({
                requestBody: { email, otp }
            });
            login(result.user, result.token);
            toast({ title: "Account verified!", description: `Welcome ${result.user.name}` });
            const dashboards = {
                customer: "/customer/dashboard",
                vendor: "/vendor/dashboard",
                admin: "/admin/dashboard"
            };
            navigate(dashboards[result.user.role]);
        } catch (error) {
            toast({
                title: "Verification failed",
                description: getErrorMessage(error, "Invalid or expired OTP."),
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            toast({ title: "Enter your email first", variant: "destructive" });
            return;
        }
        setIsResending(true);
        try {
            await AuthService.postApiAuthRequestOtp({ requestBody: { email } });
            toast({ title: "OTP sent", description: "Check your email for the new code." });
        } catch (error) {
            toast({
                title: "Failed to send OTP",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                                <span className="text-xl font-bold text-primary-foreground">E</span>
                            </div>
                        </Link>
                        <CardTitle className="text-2xl">Verify your email</CardTitle>
                        <CardDescription>Enter the OTP sent to your email address</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="otp">OTP</Label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="otp"
                                        type="text"
                                        placeholder="Enter OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Verifying..." : "Verify Account"}
                            </Button>
                        </form>
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={handleResend}
                                className="text-primary font-medium hover:underline"
                                disabled={isResending}
                            >
                                {isResending ? "Sending..." : "Resend OTP"}
                            </button>
                            <Link to="/login" className="hover:underline">
                                Back to login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
