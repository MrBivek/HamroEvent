import { useEffect, useState } from "react";
import { Star, Eye, EyeOff, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AdminService } from "@/services/AdminService";
import { getErrorMessage } from "@/lib/api";
import type { Review } from "@/types";

export default function AdminReviews() {
    const { toast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminReviews({ page: 1, limit: 50 });
                if (!active) return;
                setReviews(res?.items || []);
            } catch {
                if (!active) return;
                setReviews([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleHide = async (id: string) => {
        try {
            await AdminService.patchApiAdminReviews({ id, requestBody: { isHidden: true } });
            setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, isHidden: true } : r)));
            toast({ title: "Review hidden" });
        } catch (error) {
            toast({
                title: "Failed to hide review",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleUnhide = async (id: string) => {
        try {
            await AdminService.patchApiAdminReviews({ id, requestBody: { isHidden: false } });
            setReviews((prev) => prev.map((r) => (r._id === id ? { ...r, isHidden: false } : r)));
            toast({ title: "Review restored" });
        } catch (error) {
            toast({
                title: "Failed to restore review",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Review Moderation</h1>
                <p className="text-muted-foreground">Monitor and moderate customer reviews</p>
            </div>

            <div className="space-y-4">
                {reviews.map((review) => (
                    <Card key={review._id} className={review.isHidden ? "opacity-60" : ""}>
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-medium text-foreground">
                                            {review.customerName || "Customer"}
                                        </span>
                                        <span className="text-muted-foreground">→</span>
                                        <span className="text-foreground">{review.vendorName || "Vendor"}</span>
                                        {review.flagged && (
                                            <Badge variant="destructive">
                                                <Flag className="h-3 w-3 mr-1" />
                                                Flagged
                                            </Badge>
                                        )}
                                        {review.isHidden && <Badge variant="soft">Hidden</Badge>}
                                    </div>
                                    <div className="flex items-center gap-1 mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                className={`h-4 w-4 ${i < review.rating ? "fill-warning text-warning" : "text-muted"}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground">{review.comment}</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {review.isHidden ? (
                                        <Button variant="outline" size="sm" onClick={() => handleUnhide(review._id)}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            Show
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => handleHide(review._id)}>
                                            <EyeOff className="h-4 w-4 mr-1" />
                                            Hide
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
