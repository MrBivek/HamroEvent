import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Star, MapPin, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useShortlistStore } from "@/store/shortlistStore.ts";
import { FavoritesService } from "@/services/FavoritesService";
import { resolveMediaUrl } from "@/lib/api";
import type { VendorProfile } from "@/types";

export default function CustomerShortlist() {
    const { removeFromShortlist, loadShortlist } = useShortlistStore();
    const [vendors, setVendors] = useState<VendorProfile[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                await loadShortlist();
                const res = await FavoritesService.getApiFavorites({ page: 1, limit: 50 });
                if (!active) return;
                setVendors(res?.items || []);
            } catch {
                if (!active) return;
                setVendors([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [loadShortlist]);

    const handleClearAll = async () => {
        await Promise.all(vendors.map((vendor) => removeFromShortlist(vendor._id)));
        setVendors([]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Favorites</h1>
                    <p className="text-muted-foreground">
                        {vendors.length} vendor{vendors.length !== 1 ? "s" : ""} saved
                    </p>
                </div>
                {vendors.length > 0 && (
                    <Button variant="outline" onClick={handleClearAll}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All
                    </Button>
                )}
            </div>

            {/* Vendors Grid */}
            {vendors.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendors.map((vendor, index) => (
                        <motion.div
                            key={vendor._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card variant="interactive" className="overflow-hidden">
                                <div className="relative aspect-[4/3]">
                                    <img
                                        src={resolveMediaUrl(vendor.portfolioMedia[0])}
                                        alt={vendor.businessName}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={async () => {
                                            await removeFromShortlist(vendor._id);
                                            setVendors((prev) => prev.filter((v) => v._id !== vendor._id));
                                        }}
                                        className="absolute top-3 right-3 h-9 w-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                                    >
                                        <Heart className="h-4 w-4 fill-current" />
                                    </button>
                                    <div className="absolute bottom-3 left-3">
                                        <Badge variant="soft" className="capitalize">
                                            {(vendor.category || "service").replace("-", " & ")}
                                        </Badge>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <h3 className="font-semibold text-foreground mb-1">{vendor.businessName}</h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                        <div className="flex items-center gap-1">
                                            <Star className="h-4 w-4 fill-warning text-warning" />
                                            <span>{vendor.ratingAvg}</span>
                                        </div>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-4 w-4" />
                                            <span>{vendor.location}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-foreground">
                                            From NPR {vendor.pricingRange.min.toLocaleString()}
                                        </span>
                                        <Button variant="soft" size="sm" asChild>
                                            <Link to={`/vendors/${vendor._id}`}>View</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <CardContent>
                        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No favorite vendors yet</h3>
                        <p className="text-muted-foreground mb-4">Save vendors you like to compare them later</p>
                        <Button variant="hero" asChild>
                            <Link to="/vendors">Browse Vendors</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
