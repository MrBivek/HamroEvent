import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AuthService } from "@/services/AuthService";
import { getErrorMessage } from "@/lib/api";

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        const prefill = searchParams.get("email");
        if (prefill) setEmail(prefill);
    }, [searchParams]);

    const handleVerifyOtp = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsVerifying(true);
        try {
            const result = await AuthService.postApiAuthVerifyResetOtp({
                requestBody: { email, otp },
            });
            setResetToken(result.resetToken);
            toast({
                title: "OTP verified",
                description: "You can now set a new password.",
            });
        } catch (error) {
            toast({
                title: "OTP verification failed",
                description: getErrorMessage(error, "Please check the code and try again."),
                variant: "destructive",
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResetPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({
                title: "Passwords do not match",
                description: "Please enter the same password in both fields.",
                variant: "destructive",
            });
            return;
        }

        setIsResetting(true);
        try {
            await AuthService.postApiAuthResetPassword({
                requestBody: {
                    email,
                    resetToken,
                    newPassword,
                },
            });
            toast({
                title: "Password updated",
                description: "You can now sign in with your new password.",
            });
            navigate("/login");
        } catch (error) {
            toast({
                title: "Could not reset password",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        } finally {
            setIsResetting(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            toast({ title: "Enter your email first", variant: "destructive" });
            return;
        }
        setIsResending(true);
        try {
            await AuthService.postApiAuthForgotPassword({
                requestBody: { email },
            });
            setResetToken("");
            setOtp("");
            toast({
                title: "OTP sent",
                description: "Check your email for the new reset code.",
            });
        } catch (error) {
            toast({
                title: "Could not resend code",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
                <Card className="shadow-xl">
                    <CardHeader className="text-center">
                        <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4">
                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                                <span className="text-xl font-bold text-primary-foreground">E</span>
                            </div>
                        </Link>
                        <CardTitle className="text-2xl">
                            {resetToken ? "Set your new password" : "Verify your reset code"}
                        </CardTitle>
                        <CardDescription>
                            {resetToken
                                ? "Choose a fresh password for your Evently account."
                                : "Enter the OTP sent to your email, then we’ll unlock password reset."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!resetToken ? (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isVerifying}>
                                    {isVerifying ? "Verifying..." : "Verify OTP"}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="newPassword"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pl-10 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword((value) => !value)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isResetting}>
                                    {isResetting ? "Updating..." : "Change Password"}
                                </Button>
                            </form>
                        )}

                        <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                            <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                                Back to login
                            </Link>
                            {!resetToken && (
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    className="text-primary font-medium hover:underline"
                                    disabled={isResending}
                                >
                                    {isResending ? "Sending..." : "Resend OTP"}
                                </button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
