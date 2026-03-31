import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { AccountService } from "@/services/AccountService";
import { getErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast.ts";
import { useAuthStore } from "@/store/authStore.ts";
import type { AccountSecurityStatus, TwoFactorSetupResponse } from "@/types";

const EMPTY_SECURITY_STATUS: AccountSecurityStatus = {
    email: "",
    twoFactorEnabled: false,
    hasPendingSetup: false
};

export function TwoFactorSettingsCard() {
    const { toast } = useToast();
    const { updateUser } = useAuthStore();
    const [status, setStatus] = useState<AccountSecurityStatus>(EMPTY_SECURITY_STATUS);
    const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isStartingSetup, setIsStartingSetup] = useState(false);
    const [isEnabling, setIsEnabling] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const response = await AccountService.getApiAccountSecurity();
                if (!active) return;
                setStatus(response);
            } catch {
                if (!active) return;
                setStatus(EMPTY_SECURITY_STATUS);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleStartSetup = async () => {
        setIsStartingSetup(true);
        try {
            const response = await AccountService.postApiAccount2faSetup();
            setSetupData(response);
            setVerificationCode("");
            toast({
                title: "Authenticator setup ready",
                description: "Scan the QR code and enter the 6-digit code from your app."
            });
        } catch (error) {
            toast({
                title: "Could not start 2FA setup",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsStartingSetup(false);
        }
    };

    const handleEnable = async () => {
        setIsEnabling(true);
        try {
            const response = await AccountService.postApiAccount2faEnable({
                requestBody: { code: verificationCode }
            });
            updateUser({ twoFactorEnabled: response.user.twoFactorEnabled });
            setStatus((previous) => ({
                ...previous,
                twoFactorEnabled: true,
                hasPendingSetup: false
            }));
            setSetupData(null);
            setVerificationCode("");
            toast({
                title: "2FA enabled",
                description: "You’ll be asked for an authenticator code during login now."
            });
        } catch (error) {
            toast({
                title: "Could not enable 2FA",
                description: getErrorMessage(error, "Please verify the code and try again."),
                variant: "destructive"
            });
        } finally {
            setIsEnabling(false);
        }
    };

    const handleDisable = async () => {
        setIsDisabling(true);
        try {
            const response = await AccountService.postApiAccount2faDisable({
                requestBody: { code: disableCode }
            });
            updateUser({ twoFactorEnabled: response.user.twoFactorEnabled });
            setStatus((previous) => ({
                ...previous,
                twoFactorEnabled: false,
                hasPendingSetup: false
            }));
            setSetupData(null);
            setDisableCode("");
            toast({
                title: "2FA disabled",
                description: "Authenticator login has been turned off for your account."
            });
        } catch (error) {
            toast({
                title: "Could not disable 2FA",
                description: getErrorMessage(error, "Please verify the code and try again."),
                variant: "destructive"
            });
        } finally {
            setIsDisabling(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add an authenticator app check to your login for stronger account security.
                    </p>
                </div>
                <Badge variant={status.twoFactorEnabled ? "success" : "outline"}>
                    {status.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading security settings...</p>
                ) : !status.twoFactorEnabled ? (
                    <>
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                            After you enable this, login will ask for the 6-digit code from your authenticator app after
                            your password is verified.
                        </div>

                        {!setupData ? (
                            <Button variant="hero" onClick={handleStartSetup} disabled={isStartingSetup}>
                                {isStartingSetup ? "Preparing QR..." : "Enable 2FA"}
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                                    <div className="rounded-2xl border border-border/70 bg-white p-3">
                                        <img
                                            src={setupData.qrCodeDataUrl}
                                            alt="2FA QR code"
                                            className="mx-auto h-full w-full max-w-[180px]"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Manual key</p>
                                            <p className="mt-1 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 font-mono text-sm">
                                                {setupData.manualEntryKey}
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="twoFactorCode">Authenticator code</Label>
                                            <Input
                                                id="twoFactorCode"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="Enter 6-digit code"
                                                value={verificationCode}
                                                onChange={(event) => setVerificationCode(event.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="hero"
                                                onClick={handleEnable}
                                                disabled={verificationCode.length !== 6 || isEnabling}
                                            >
                                                {isEnabling ? "Verifying..." : "Verify and Enable"}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleStartSetup}
                                                disabled={isStartingSetup}
                                            >
                                                Regenerate QR
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-success/20 bg-success-soft/60 p-4 text-sm text-foreground">
                            Two-factor authentication is active. To disable it, confirm with a fresh code from your
                            authenticator app.
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="disableTwoFactorCode">Authenticator code</Label>
                            <Input
                                id="disableTwoFactorCode"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="Enter 6-digit code"
                                value={disableCode}
                                onChange={(event) => setDisableCode(event.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleDisable}
                            disabled={disableCode.length !== 6 || isDisabling}
                        >
                            {isDisabling ? "Disabling..." : "Disable 2FA"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
