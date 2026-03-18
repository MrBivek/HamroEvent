import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AuthService } from "@/services/AuthService";
import { getErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await AuthService.postApiAuthForgotPassword({
                requestBody: { email },
            });
            toast({
                title: "OTP sent",
                description: "Check your email for the password reset code.",
            });
            navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        } catch (error) {
            toast({
                title: "Could not send reset code",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
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
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                            <ShieldAlert className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-2xl">Forgot your password?</CardTitle>
                        <CardDescription>
                            We’ll send a one-time code to your email so you can reset it securely.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Sending code..." : "Send reset OTP"}
                            </Button>
                        </form>

                        <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
                            <Link to="/login" className="inline-flex items-center gap-1 hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                                Back to login
                            </Link>
                            <Link to="/reset-password" className="text-primary font-medium hover:underline">
                                I already have the code
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
