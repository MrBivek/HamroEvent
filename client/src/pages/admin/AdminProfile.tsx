import { User, Mail, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useAuthStore } from "@/store/authStore.ts";
import { TwoFactorSettingsCard } from "@/components/account/TwoFactorSettingsCard.tsx";

export default function AdminProfile() {
    const { user } = useAuthStore();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Profile</h1>
                <p className="text-muted-foreground">Manage your account security and administrator identity.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Account Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Name</p>
                                <p className="font-medium text-foreground">{user?.name}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-soft text-secondary">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-medium text-foreground">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 p-4 md:col-span-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning-soft text-warning">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Role</p>
                                <p className="font-medium text-foreground capitalize">{user?.role}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <TwoFactorSettingsCard />
        </div>
    );
}
