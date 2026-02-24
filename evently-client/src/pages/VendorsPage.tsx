import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, SlidersHorizontal, X, Star, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { VendorCard } from "@/components/vendors/VendorCard.tsx";
import { CatalogService } from "@/services/CatalogService";
import { MarketplaceService } from "@/services/MarketplaceService";
import { getCategoryMeta } from "@/data/catalog";
import type { Category, Location, VendorProfile } from "@/types";

export default function VendorsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Filter states
    const [keyword, setKeyword] = useState(searchParams.get("q") || "");
    const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "");
    const [selectedLocation, setSelectedLocation] = useState<string>(searchParams.get("location") || "");
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
    const [minRating, setMinRating] = useState<number>(0);
    const [sortBy, setSortBy] = useState<string>("rating");
    const [vendors, setVendors] = useState<VendorProfile[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let active = true;
        const loadFilters = async () => {
            try {
                const [categoriesRes, locationsRes] = await Promise.all([
                    CatalogService.getApiCategories({ active: true }),
                    CatalogService.getApiLocations({ type: "CITY" })
                ]);
                if (!active) return;
                setCategories(categoriesRes?.items || []);
                setLocations(locationsRes?.items || []);
            } catch {
                if (!active) return;
                setCategories([]);
                setLocations([]);
            }
        };
        loadFilters();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;
        const loadVendors = async () => {
            const params: Record<string, string> = {};
            if (keyword) params.q = keyword;
            if (selectedCategory && selectedCategory !== "all") params.category = selectedCategory;
            if (selectedLocation && selectedLocation !== "all") params.location = selectedLocation;
            if (verifiedOnly) params.verified = "true";
            if (minRating > 0) params.minRating = String(minRating);
            if (priceRange[0] > 0) params.priceMin = String(priceRange[0]);
            if (priceRange[1] < 500000) params.priceMax = String(priceRange[1]);
            if (sortBy) params.sortBy = sortBy;
            setSearchParams(params, { replace: true });
            setIsLoading(true);
            try {
                const res = await MarketplaceService.getApiVendors({
                    q: keyword || undefined,
                    category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
                    location: selectedLocation && selectedLocation !== "all" ? selectedLocation : undefined,
                    verified: verifiedOnly || undefined,
                    minRating: minRating > 0 ? minRating : undefined,
                    priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
                    priceMax: priceRange[1] < 500000 ? priceRange[1] : undefined,
                    sortBy: sortBy || undefined,
                    page: 1,
                    limit: 50
                });
                if (!active) return;
                setVendors(res?.items || []);
                setTotal(res?.total || 0);
            } catch {
                if (!active) return;
                setVendors([]);
                setTotal(0);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        loadVendors();
        return () => {
            active = false;
        };
    }, [keyword, selectedCategory, selectedLocation, verifiedOnly, priceRange, minRating, sortBy, setSearchParams]);

    const clearFilters = () => {
        setKeyword("");
        setSelectedCategory("");
        setSelectedLocation("");
        setVerifiedOnly(false);
        setPriceRange([0, 500000]);
        setMinRating(0);
        setSearchParams({});
    };

    const activeFilterCount = [
        keyword,
        selectedCategory && selectedCategory !== "all",
        selectedLocation && selectedLocation !== "all",
        verifiedOnly,
        minRating > 0,
        priceRange[0] > 0 || priceRange[1] < 500000
    ].filter(Boolean).length;

    const FilterContent = () => (
        <div className="space-y-6">
            {/* Category */}
            <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Category</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                        const value = cat.slug || cat.name || cat._id;
                        const meta = getCategoryMeta(cat.slug || cat.name);
                        return (
                            <Badge
                                key={cat._id || value}
                                variant={selectedCategory === value ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => setSelectedCategory(selectedCategory === value ? "" : value)}
                            >
                                <span className="mr-1">{meta.icon}</span>
                                {meta.label || cat.name}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Location */}
            <div>
                <label className="text-sm font-medium text-foreground mb-3 block">Location</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locations.map((loc) => (
                            <SelectItem key={loc._id || loc.name} value={loc.name}>
                                {loc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Verified Only */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="verified"
                    checked={verifiedOnly}
                    onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                />
                <label htmlFor="verified" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4 text-secondary" />
                    Verified vendors only
                </label>
            </div>

            {/* Rating */}
            <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                    Minimum Rating: {minRating > 0 ? `${minRating}+` : "Any"}
                </label>
                <div className="flex gap-2">
                    {[0, 3, 4].map((rating) => (
                        <Button
                            key={rating}
                            variant={minRating === rating ? "default" : "outline"}
                            size="sm"
                            onClick={() => setMinRating(rating)}
                        >
                            {rating === 0 ? (
                                "Any"
                            ) : (
                                <>
                                    {rating}
                                    <Star className="h-3 w-3 ml-1 fill-current" />
                                </>
                            )}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                    Price Range: NPR {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                </label>
                <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value as [number, number])}
                    min={0}
                    max={500000}
                    step={10000}
                    className="mt-2"
                />
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear all filters
                </Button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="gradient-wave py-12 md:py-16">
                <div className="container">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Browse Vendors</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Discover trusted event service providers across Nepal
                    </p>
                </div>
            </div>

            <div className="container py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Desktop Filters */}
                    <aside className="hidden lg:block w-72 shrink-0">
                        <Card className="sticky top-24">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-semibold text-foreground">Filters</h2>
                                    {activeFilterCount > 0 && <Badge variant="soft">{activeFilterCount} active</Badge>}
                                </div>
                                <FilterContent />
                            </CardContent>
                        </Card>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Search & Sort Bar */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search vendors..."
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="flex gap-2">
                                {/* Mobile Filter Button */}
                                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" className="lg:hidden">
                                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                                            Filters
                                            {activeFilterCount > 0 && (
                                                <Badge variant="soft" className="ml-2">
                                                    {activeFilterCount}
                                                </Badge>
                                            )}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-80">
                                        <SheetHeader>
                                            <SheetTitle>Filters</SheetTitle>
                                        </SheetHeader>
                                        <div className="mt-6">
                                            <FilterContent />
                                        </div>
                                    </SheetContent>
                                </Sheet>

                                {/* Sort */}
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rating">Top Rated</SelectItem>
                                        <SelectItem value="reviews">Most Reviews</SelectItem>
                                        <SelectItem value="latest">Newest</SelectItem>
                                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Results Count */}
                        <p className="text-sm text-muted-foreground mb-6">
                            {isLoading
                                ? "Loading vendors..."
                                : `Showing ${vendors.length} of ${total} vendor${total !== 1 ? "s" : ""}`}
                        </p>

                        {/* Vendor Grid */}
                        {vendors.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {vendors.map((vendor, index) => (
                                    <VendorCard key={vendor._id} vendor={vendor} index={index} />
                                ))}
                            </div>
                        ) : (
                            <Card className="py-16 text-center">
                                <CardContent>
                                    <div className="text-4xl mb-4">🔍</div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No vendors found</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Try adjusting your filters or search terms
                                    </p>
                                    <Button variant="outline" onClick={clearFilters}>
                                        Clear all filters
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
