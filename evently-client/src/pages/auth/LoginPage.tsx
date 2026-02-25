import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { AuthService } from "@/services/AuthService";
import { getErrorMessage } from "@/lib/api";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await AuthService.postApiAuthLogin({
                requestBody: { email, password }
            });
            login(result.user, result.token);
            toast({ title: "Welcome back!", description: `Logged in as ${result.user.name}` });
            const dashboards = {
                customer: "/customer/dashboard",
                vendor: "/vendor/dashboard",
                admin: "/admin/dashboard"
            };
            navigate(dashboards[result.user.role]);
        } catch (error) {
            const message = getErrorMessage(error, "Invalid credentials. Please try again.");
            if (message.toLowerCase().includes("account not verified")) {
                navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
                toast({
                    title: "Verify your account",
                    description: "Please enter the OTP sent to your email."
                });
                return;
            }
            toast({
                title: "Login failed",
                description: message,
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
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
                        <CardTitle className="text-2xl">Welcome back</CardTitle>
                        <CardDescription>Sign in to your Evently account</CardDescription>
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
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                                {isLoading ? "Signing in..." : "Sign in"}
                            </Button>
                        </form>
                        <p className="text-center text-sm text-muted-foreground mt-6">
                            Don't have an account?{" "}
                            <Link to="/register/customer" className="text-primary font-medium hover:underline">
                                Sign up
                            </Link>
                        </p>
                        <p className="text-center text-sm text-muted-foreground mt-4">
                            Want to become a vendor?{" "}
                            <Link to="/register/vendor" className="text-primary font-medium hover:underline">
                                Register here
                            </Link>
                        </p>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
