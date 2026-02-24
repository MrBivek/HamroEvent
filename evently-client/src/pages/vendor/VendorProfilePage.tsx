import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Save, Plus, Trash2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast.ts";
import { VendorsService } from "@/services/VendorsService";
import { PackagesService } from "@/services/PackagesService";
import { OpenAPI } from "@/core/OpenAPI";
import { request } from "@/core/request";
import { fileToBase64, getErrorMessage, resolveMediaUrl } from "@/lib/api";
import type { ServicePackage, VendorProfile } from "@/types";

export default function VendorProfile() {
    const { toast } = useToast();
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [packages, setPackages] = useState<ServicePackage[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        businessName: "",
        category: "",
        description: "",
        location: "",
        phone: "",
        email: ""
    });

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const profile = await VendorsService.getApiVendorsMe();
                if (!active) return;
                setVendor(profile);
                setPackages(profile?.packages || []);
                setFormData({
                    businessName: profile?.businessName || "",
                    category: profile?.category || "",
                    description: profile?.description || "",
                    location: profile?.location || "",
                    phone: profile?.contact?.phone || "",
                    email: profile?.contact?.email || ""
                });
            } catch {
                if (!active) return;
                setVendor(null);
                setPackages([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await request(OpenAPI, {
                method: "PATCH",
                url: "/api/vendors/me",
                body: {
                    businessName: formData.businessName,
                    description: formData.description,
                    location: formData.location,
                    contact: {
                        phone: formData.phone,
                        email: formData.email
                    }
                },
                mediaType: "application/json"
            });
            toast({ title: "Profile saved", description: "Your changes have been saved." });
        } catch (error) {
            toast({
                title: "Failed to save",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePackage = async (id: string) => {
        try {
            await PackagesService.deleteApiVendorsMePackages({ id });
            setPackages((prev) => prev.filter((pkg) => pkg._id !== id));
            toast({ title: "Package removed" });
        } catch (error) {
            toast({
                title: "Failed to delete package",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleUploadPortfolio = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        try {
            const images = await Promise.all(
                Array.from(files).map(async (file) => ({
                    data: await fileToBase64(file, 10),
                    filename: file.name,
                    mimeType: file.type
                }))
            );
            const updated = await VendorsService.postApiVendorsMePortfolio({ requestBody: { images } });
            setVendor(updated);
        } catch (error) {
            toast({
                title: "Upload failed",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleRemovePortfolio = async (url: string) => {
        try {
            const updated = await VendorsService.deleteApiVendorsMePortfolio({ requestBody: { url } });
            setVendor(updated);
        } catch (error) {
            toast({
                title: "Failed to remove image",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    if (!vendor) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
                    <p className="text-muted-foreground">Manage your vendor profile and packages</p>
                </div>
                <Card>
                    <CardContent className="p-6 text-muted-foreground">Unable to load profile.</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
                    <p className="text-muted-foreground">Manage your vendor profile and packages</p>
                </div>
                <Button variant="hero" onClick={handleSave} disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            {/* Basic Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Business Name</Label>
                            <Input
                                value={formData.businessName}
                                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input value={formData.category} disabled className="capitalize" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                        />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Service Packages */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Service Packages</CardTitle>
                    <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Package
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {packages.map((pkg) => (
                            <div key={pkg._id} className="p-4 border border-border rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-medium text-foreground">{pkg.name}</h4>
                                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive"
                                        onClick={() => handleDeletePackage(pkg._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {pkg.inclusions.map((item, i) => (
                                        <Badge key={i} variant="outline">
                                            {item}
                                        </Badge>
                                    ))}
                                </div>
                                <p className="text-sm font-medium text-foreground mt-3">
                                    NPR {pkg.priceMin.toLocaleString()} - {pkg.priceMax?.toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Portfolio */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Portfolio</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <label className="cursor-pointer">
                            <Image className="h-4 w-4 mr-2" />
                            Upload Images
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => handleUploadPortfolio(e.target.files)}
                            />
                        </label>
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {vendor.portfolioMedia.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                                <img src={resolveMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => handleRemovePortfolio(img)}
                                    className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                    <Trash2 className="h-6 w-6 text-primary-foreground" />
                                </button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
