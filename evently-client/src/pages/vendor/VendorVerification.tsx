import { useEffect, useState } from "react";
import { Upload, BadgeCheck, Clock, XCircle, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { VendorsService } from "@/services/VendorsService";
import { DocumentsService } from "@/services/DocumentsService";
import { VendorVerificationService } from "@/services/VendorVerificationService";
import { fileToBase64, getErrorMessage, resolveMediaUrl } from "@/lib/api";
import { useToast } from "@/hooks/use-toast.ts";
import type { VendorProfile, DocumentItem } from "@/types";

export default function VendorVerification() {
    const { toast } = useToast();
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [status, setStatus] = useState<string>("pending");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const [res, docsRes] = await Promise.all([
                    VendorsService.getApiVendorsMe(),
                    DocumentsService.getApiVendorsMeDocuments({ page: 1, limit: 50 })
                ]);
                if (!active) return;
                setVendor(res);
                setStatus(res?.verificationStatus || res?.verifiedStatus || "pending");
                setDocuments(docsRes?.items || []);
            } catch {
                if (!active) return;
                setVendor(null);
                setStatus("pending");
                setDocuments([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const getStatusDisplay = () => {
        switch (status) {
            case "verified":
                return { icon: BadgeCheck, text: "Verified", variant: "success" as const, color: "text-success" };
            case "pending":
                return { icon: Clock, text: "Pending Review", variant: "warning" as const, color: "text-warning" };
            case "rejected":
                return { icon: XCircle, text: "Rejected", variant: "destructive" as const, color: "text-destructive" };
        }
    };

    const statusInfo = getStatusDisplay();

    const handleFileSelect = (files: FileList | null) => {
        if (!files) return;
        setSelectedFiles(Array.from(files));
    };

    const handleSubmit = async () => {
        if (selectedFiles.length === 0) {
            toast({ title: "Please select documents", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const uploadedIds: string[] = [];
            for (const file of selectedFiles) {
                const data = await fileToBase64(file, 10);
                const doc = await DocumentsService.postApiVendorsMeDocuments({
                    requestBody: {
                        name: file.name,
                        type: file.type,
                        data
                    }
                });
                if (doc?._id) uploadedIds.push(doc._id);
            }
            await VendorVerificationService.postApiVendorsMeVerificationRequests({
                requestBody: { documentIds: uploadedIds }
            });
            const docsRes = await DocumentsService.getApiVendorsMeDocuments({ page: 1, limit: 50 });
            setDocuments(docsRes?.items || []);
            toast({ title: "Verification submitted", description: "We are reviewing your documents." });
            setStatus("pending");
            setSelectedFiles([]);
        } catch (error) {
            toast({
                title: "Submission failed",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Verification</h1>
                <p className="text-muted-foreground">Get verified to increase visibility and trust</p>
            </div>

            {/* Status Card */}
            <Card
                className={
                    status === "verified"
                        ? "bg-success-soft border-success/20"
                        : status === "pending"
                          ? "bg-warning-soft border-warning/20"
                          : ""
                }
            >
                <CardContent className="p-6 flex items-center gap-4">
                    <statusInfo.icon className={`h-12 w-12 ${statusInfo.color}`} />
                    <div>
                        <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                        <p className="text-muted-foreground mt-1">
                            {status === "verified" && "Your business is verified and visible to all customers."}
                            {status === "pending" &&
                                "We are reviewing your documents. This usually takes 1-2 business days."}
                            {status === "rejected" && "Please upload valid documents and try again."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Upload Documents */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Verification Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {documents.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-foreground">Uploaded Documents</p>
                            <div className="grid grid-cols-2 gap-3">
                                {documents.map((doc) => {
                                    const url = resolveMediaUrl(doc.url);
                                    return (
                                        <div
                                            key={doc._id}
                                            className="rounded-lg border border-border p-2 text-center text-xs text-muted-foreground"
                                        >
                                            <img
                                                src={url}
                                                alt={doc.name || "Document"}
                                                className="w-full h-24 object-cover rounded-md mb-2"
                                            />
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="truncate block hover:underline"
                                            >
                                                {doc.name || "Document"}
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                        <p className="font-medium text-foreground mb-1">Upload Documents</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Business registration, ID proof, or trade license
                        </p>
                        <Button variant="outline" asChild>
                            <label className="cursor-pointer">
                                <FileText className="h-4 w-4 mr-2" />
                                Choose Files
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(e.target.files)}
                                />
                            </label>
                        </Button>
                        {selectedFiles.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-2">Required Documents:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Business Registration Certificate</li>
                            <li>Owner ID (Citizenship/Passport)</li>
                            <li>PAN/VAT Certificate (if applicable)</li>
                        </ul>
                    </div>

                    <Button
                        variant="hero"
                        className="w-full"
                        disabled={status === "verified" || isSubmitting}
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? "Submitting..." : "Submit for Verification"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
