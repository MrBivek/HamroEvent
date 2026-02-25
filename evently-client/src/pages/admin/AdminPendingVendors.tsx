import { useEffect, useState } from "react";
import {
    CheckCircle2,
    XCircle,
    Eye,
    MapPin,
    Mail,
    Phone,
    Globe,
    Instagram,
    Facebook,
    FileText,
    Package,
    CalendarDays,
    Star,
    BadgeCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { AdminService } from "@/services/AdminService";
import { getErrorMessage, resolveMediaUrl } from "@/lib/api";
import type { VerificationRequest, DocumentItem, VendorProfile } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";

export default function AdminPendingVendors() {
    const { toast } = useToast();
    const [pendingVendors, setPendingVendors] = useState<VerificationRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminVerificationRequests({
                    status: "PENDING",
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setPendingVendors(res?.items || []);
            } catch {
                if (!active) return;
                setPendingVendors([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleApprove = async (id: string, name: string) => {
        try {
            await AdminService.patchApiAdminVerificationRequestsDecision({
                id,
                requestBody: { decision: "APPROVE" }
            });
            setPendingVendors((prev) => prev.filter((v) => v._id !== id));
            toast({ title: "Vendor approved", description: `${name} is now verified.` });
        } catch (error) {
            toast({
                title: "Failed to approve",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleReject = async (id: string, name: string) => {
        try {
            await AdminService.patchApiAdminVerificationRequestsDecision({
                id,
                requestBody: { decision: "REJECT" }
            });
            setPendingVendors((prev) => prev.filter((v) => v._id !== id));
            toast({ title: "Vendor rejected", description: `${name} has been notified.`, variant: "destructive" });
        } catch (error) {
            toast({
                title: "Failed to reject",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const openReview = (request: VerificationRequest) => {
        setSelectedRequest(request);
        setIsReviewOpen(true);
    };

    const documentsFromRequest = (request: VerificationRequest): DocumentItem[] => {
        if (request.documents && request.documents.length > 0) return request.documents;
        const vendor = request.vendor as VendorProfile | undefined;
        const fallback = vendor?.verificationDocs || [];
        return fallback.map((url, index) => ({
            _id: `${vendor?._id || request._id}-doc-${index}`,
            url,
            name: `Document ${index + 1}`
        }));
    };

    const renderDocumentCard = (doc: DocumentItem) => {
        const url = resolveMediaUrl(doc.url);
        const isImage = (doc.mimeType || "").startsWith("image/");
        return (
            <div
                key={doc._id}
                className="rounded-lg border border-border p-2 text-center text-xs text-muted-foreground"
            >
                {isImage ? (
                    <img src={url} alt={doc.name || "Document"} className="w-full h-24 object-cover rounded-md mb-2" />
                ) : (
                    <div className="h-24 flex items-center justify-center rounded-md bg-muted/50 mb-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                )}
                <a href={url} target="_blank" rel="noreferrer" className="truncate block hover:underline">
                    {doc.name || "Document"}
                </a>
            </div>
        );
    };

    const formatPrice = (min?: number, max?: number) => {
        const safeMin = min ?? 0;
        const safeMax = max ?? safeMin;
        return `NPR ${safeMin.toLocaleString()} - ${safeMax.toLocaleString()}`;
    };

    const getSubmittedAt = (request: VerificationRequest) =>
        new Date(request.submittedAt || request.createdAt || Date.now()).toLocaleDateString();

    const getVendorImage = (vendor?: VendorProfile) => resolveMediaUrl(vendor?.portfolioMedia?.[0]);

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Pending Verifications</h1>
                    <p className="text-muted-foreground">{pendingVendors.length} vendors awaiting review</p>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {pendingVendors.map((request) => {
                        const requestId = String(request._id || request.id);
                        const vendorProfile = request.vendor as VendorProfile | undefined;
                        const documentsCount =
                            request.documentsCount ??
                            documentsFromRequest(request).length ??
                            vendorProfile?.verificationDocs?.length ??
                            0;
                        const packagesCount = vendorProfile?.packages?.length ?? 0;
                        return (
                            <Card key={requestId} className="overflow-hidden hover-lift">
                                <div className="relative">
                                    <img
                                        src={getVendorImage(vendorProfile)}
                                        alt={vendorProfile?.businessName || "Vendor"}
                                        className="h-40 w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                    <div className="absolute top-3 left-3">
                                        <Badge variant="soft" className="bg-white/90 text-foreground">
                                            Pending Review
                                        </Badge>
                                    </div>
                                    <div className="absolute bottom-3 left-3">
                                        <p className="text-white font-semibold text-lg drop-shadow">
                                            {vendorProfile?.businessName || "Unknown Vendor"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-white/90">
                                            <MapPin className="h-3.5 w-3.5" />
                                            <span>{vendorProfile?.location || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline">{vendorProfile?.category || "service"}</Badge>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <CalendarDays className="h-3.5 w-3.5" />
                                            <span>{getSubmittedAt(request)}</span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {vendorProfile?.description || "No description provided yet."}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div className="rounded-md bg-muted/40 p-2 text-center">
                                            <p className="text-muted-foreground">Docs</p>
                                            <p className="font-semibold text-foreground">{documentsCount}</p>
                                        </div>
                                        <div className="rounded-md bg-muted/40 p-2 text-center">
                                            <p className="text-muted-foreground">Packages</p>
                                            <p className="font-semibold text-foreground">{packagesCount}</p>
                                        </div>
                                        <div className="rounded-md bg-muted/40 p-2 text-center">
                                            <p className="text-muted-foreground">Rating</p>
                                            <p className="font-semibold text-foreground">
                                                {vendorProfile?.ratingAvg?.toFixed?.(1) ?? "0.0"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openReview(request)}>
                                            <Eye className="h-4 w-4 mr-1" />
                                            Review
                                        </Button>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() =>
                                                handleApprove(requestId, vendorProfile?.businessName || "Vendor")
                                            }
                                        >
                                            <CheckCircle2 className="h-4 w-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive"
                                            onClick={() =>
                                                handleReject(requestId, vendorProfile?.businessName || "Vendor")
                                            }
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Vendor Details</DialogTitle>
                    </DialogHeader>
                    {selectedRequest ? (
                        <div className="space-y-6">
                            {(() => {
                                const vendor = selectedRequest.vendor as VendorProfile | undefined;
                                if (!vendor) return null;
                                return (
                                    <div className="space-y-4">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <img
                                                src={resolveMediaUrl(vendor.portfolioMedia?.[0])}
                                                alt={vendor.businessName}
                                                className="w-full md:w-40 h-40 object-cover rounded-lg border border-border"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <div>
                                                    <h3 className="text-xl font-semibold text-foreground">
                                                        {vendor.businessName}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <Badge variant="soft">
                                                            {vendor.category
                                                                ? vendor.category.charAt(0).toUpperCase() +
                                                                  vendor.category.slice(1).toLowerCase()
                                                                : ""}
                                                        </Badge>
                                                        <Badge variant="outline">{vendor.location || "—"}</Badge>
                                                        <Badge variant="outline" className="flex items-center gap-1">
                                                            <BadgeCheck className="h-3.5 w-3.5" />
                                                            Pending
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {vendor.description || "—"}
                                                </p>
                                                <div className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="h-4 w-4" />
                                                        <span>{vendor.contact?.phone || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4" />
                                                        <span>{vendor.contact?.email || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="h-4 w-4" />
                                                        <span>{vendor.socialLinks?.website || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Instagram className="h-4 w-4" />
                                                        <span>{vendor.socialLinks?.instagram || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Facebook className="h-4 w-4" />
                                                        <span>{vendor.socialLinks?.facebook || "—"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Star className="h-4 w-4" />
                                                        <span>
                                                            {vendor.ratingAvg?.toFixed?.(1) ?? "0.0"} (
                                                            {vendor.ratingCount} reviews)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-border p-3">
                                                <p className="text-xs text-muted-foreground">Service Areas</p>
                                                <p className="text-sm text-foreground">
                                                    {vendor.serviceAreas?.length ? vendor.serviceAreas.join(", ") : "—"}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border p-3">
                                                <p className="text-xs text-muted-foreground">Pricing Range</p>
                                                <p className="text-sm text-foreground">
                                                    {formatPrice(vendor.pricingRange?.min, vendor.pricingRange?.max)}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border p-3">
                                                <p className="text-xs text-muted-foreground">Submitted</p>
                                                <p className="text-sm text-foreground">
                                                    {getSubmittedAt(selectedRequest)}
                                                </p>
                                            </div>
                                            <div className="rounded-lg border border-border p-3">
                                                <p className="text-xs text-muted-foreground">Packages</p>
                                                <p className="text-sm text-foreground">
                                                    {vendor.packages?.length ?? 0}
                                                </p>
                                            </div>
                                        </div>

                                        {selectedRequest.vendorNote && (
                                            <div className="rounded-lg border border-border p-3">
                                                <p className="text-xs text-muted-foreground">Vendor Note</p>
                                                <p className="text-sm text-foreground">{selectedRequest.vendorNote}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">Portfolio</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {(selectedRequest.vendor as VendorProfile | undefined)?.portfolioMedia?.length ? (
                                        (selectedRequest.vendor as VendorProfile).portfolioMedia.map((url, index) => (
                                            <img
                                                key={`${selectedRequest._id}-portfolio-${index}`}
                                                src={resolveMediaUrl(url)}
                                                alt={`Portfolio ${index + 1}`}
                                                className="w-full h-28 object-cover rounded-lg border border-border"
                                            />
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No portfolio images uploaded.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">Packages</h4>
                                <div className="space-y-3">
                                    {(selectedRequest.vendor as VendorProfile | undefined)?.packages?.length ? (
                                        (selectedRequest.vendor as VendorProfile).packages.map((pkg) => (
                                            <Card key={pkg._id} className="border border-border">
                                                <CardContent className="p-4 space-y-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="font-semibold text-foreground">{pkg.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {pkg.description || "No description"}
                                                            </p>
                                                        </div>
                                                        <Badge variant={pkg.isActive ? "default" : "outline"}>
                                                            {pkg.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Package className="h-3.5 w-3.5" />
                                                            {formatPrice(pkg.priceMin, pkg.priceMax)}
                                                        </span>
                                                        {pkg.duration && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <CalendarDays className="h-3.5 w-3.5" />
                                                                {pkg.duration}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {pkg.inclusions?.length ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {pkg.inclusions.map((inc, idx) => (
                                                                <Badge key={`${pkg._id}-inc-${idx}`} variant="outline">
                                                                    {inc}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No packages submitted.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-foreground">Verification Documents</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {documentsFromRequest(selectedRequest).length > 0 ? (
                                        documentsFromRequest(selectedRequest).map(renderDocumentCard)
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </>
    );
}
