import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PaymentsService } from "@/services/PaymentsService.ts";
import { ApiError } from "@/core/ApiError";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAuthStore } from "@/store/authStore.ts";

type ReturnState = "idle" | "confirming" | "success" | "failed";

export default function RefundReturn() {
    const { provider } = useParams();
    const [searchParams] = useSearchParams();
    const { isAuthenticated } = useAuthStore();
    const [state, setState] = useState<ReturnState>("idle");
    const [message, setMessage] = useState<string>("");
    const hasConfirmed = useRef(false);

    const rawRefundId = searchParams.get("refundId") || "";
    const statusParam = (searchParams.get("status") || "").toLowerCase();
    const dataParam = searchParams.get("data") || "";

    const parseDataParam = () => {
        if (!dataParam) return null;
        try {
            const decoded = JSON.parse(atob(dataParam)) as {
                transaction_uuid?: string;
                status?: string;
            };
            return decoded;
        } catch {
            return null;
        }
    };

    const normalizedRefundId = useMemo(() => {
        if (!rawRefundId) return "";
        const splitOnData = rawRefundId.split("?data=")[0].split("&data=")[0];
        return splitOnData;
    }, [rawRefundId]);

    const decodedData = useMemo(() => parseDataParam(), [dataParam]);
    const refundId = normalizedRefundId || decodedData?.transaction_uuid || "";
    const dataStatus = (decodedData?.status || "").toLowerCase();

    const providerLabel = useMemo(() => {
        if (!provider) return "Refund";
        return provider.toUpperCase();
    }, [provider]);

    useEffect(() => {
        if (hasConfirmed.current) return;
        hasConfirmed.current = true;

        if (!refundId) {
            setState("failed");
            setMessage("Missing refund reference.");
            return;
        }

        if (statusParam === "failed" || dataStatus === "failed") {
            setState("failed");
            setMessage("Refund payment failed or was cancelled.");
            return;
        }

        if (!isAuthenticated) {
            setState("failed");
            setMessage("Please log in to confirm the refund.");
            return;
        }

        setState("confirming");
        PaymentsService.postApiRefundsConfirm({ id: refundId })
            .then(() => {
                setState("success");
                setMessage("Refund confirmed successfully.");
            })
            .catch((error) => {
                const apiMessage =
                    error instanceof ApiError
                        ? error.body?.error || error.body?.message || error.message
                        : error?.message;
                setState("failed");
                setMessage(apiMessage || "Failed to confirm refund.");
            });
    }, [isAuthenticated, refundId, statusParam, dataStatus]);

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
            <Card className="w-full max-w-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        {state === "confirming" && <Loader2 className="h-7 w-7 animate-spin text-primary" />}
                        {state === "success" && <CheckCircle2 className="h-7 w-7 text-success" />}
                        {state === "failed" && <XCircle className="h-7 w-7 text-destructive" />}
                    </div>
                    <CardTitle>{providerLabel} Refund Return</CardTitle>
                    <CardDescription>
                        {state === "confirming" && "We are confirming your refund payment."}
                        {state === "success" && "Refund payment has been confirmed."}
                        {state === "failed" && "We could not confirm the refund payment."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Refund ID</span>
                            <span className="font-medium text-foreground break-all">{refundId || "-"}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Status</span>
                            <Badge
                                variant={state === "success" ? "success" : state === "failed" ? "destructive" : "soft"}
                            >
                                {state === "confirming" ? "Confirming" : state}
                            </Badge>
                        </div>
                    </div>

                    {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" asChild className="flex-1">
                            <Link to="/vendor/bookings">Go to bookings</Link>
                        </Button>
                        <Button asChild className="flex-1">
                            <Link to="/">Return home</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
