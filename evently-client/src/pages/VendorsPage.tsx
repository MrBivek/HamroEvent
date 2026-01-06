import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Filter, SlidersHorizontal, X, Star, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Slider } from '@/components/ui/slider.tsx';
import { VendorCard } from '@/components/vendors/VendorCard.tsx';
import { mockVendors, vendorCategories, nepalLocations } from '@/data/mockData.ts';
import type { VendorCategory } from '@/types';

export default function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Filter states
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedLocation, setSelectedLocation] = useState<string>(searchParams.get('location') || '');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('rating');

  // Filter vendors
  const filteredVendors = useMemo(() => {
    let result = [...mockVendors];

    // Keyword search
    if (keyword) {
      const searchTerm = keyword.toLowerCase();
      result = result.filter(
        (v) =>
          v.businessName.toLowerCase().includes(searchTerm) ||
          v.description.toLowerCase().includes(searchTerm) ||
          v.category.toLowerCase().includes(searchTerm)
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter((v) => v.category === selectedCategory);
    }

    // Location filter
    if (selectedLocation && selectedLocation !== 'all') {
      result = result.filter(
        (v) => v.location === selectedLocation || v.serviceAreas.includes(selectedLocation)
      );
    }

    // Verified filter
    if (verifiedOnly) {
      result = result.filter((v) => v.verificationStatus === 'verified');
    }

    // Price range filter
    result = result.filter(
      (v) => v.pricingRange.min >= priceRange[0] && v.pricingRange.max <= priceRange[1]
    );

    // Rating filter
    if (minRating > 0) {
      result = result.filter((v) => v.ratingAvg >= minRating);
    }

    // Sort
    switch (sortBy) {
      case 'rating':
        result.sort((a, b) => b.ratingAvg - a.ratingAvg);
        break;
      case 'reviews':
        result.sort((a, b) => b.ratingCount - a.ratingCount);
        break;
      case 'latest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price-low':
        result.sort((a, b) => a.pricingRange.min - b.pricingRange.min);
        break;
      case 'price-high':
        result.sort((a, b) => b.pricingRange.max - a.pricingRange.max);
        break;
    }

    return result;
  }, [keyword, selectedCategory, selectedLocation, verifiedOnly, priceRange, minRating, sortBy]);

  const clearFilters = () => {
    setKeyword('');
    setSelectedCategory('');
    setSelectedLocation('');
    setVerifiedOnly(false);
    setPriceRange([0, 500000]);
    setMinRating(0);
    setSearchParams({});
  };

  const activeFilterCount = [
    keyword,
    selectedCategory && selectedCategory !== 'all',
    selectedLocation && selectedLocation !== 'all',
    verifiedOnly,
    minRating > 0,
    priceRange[0] > 0 || priceRange[1] < 500000,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className="text-sm font-medium text-foreground mb-3 block">Category</label>
        <div className="flex flex-wrap gap-2">
          {vendorCategories.map((cat) => (
            <Badge
              key={cat.value}
              variant={selectedCategory === cat.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? '' : cat.value)}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.label}
            </Badge>
          ))}
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
            {nepalLocations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
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
          Minimum Rating: {minRating > 0 ? `${minRating}+` : 'Any'}
        </label>
        <div className="flex gap-2">
          {[0, 3, 4].map((rating) => (
            <Button
              key={rating}
              variant={minRating === rating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMinRating(rating)}
            >
              {rating === 0 ? 'Any' : (
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Browse Vendors
          </h1>
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
                  {activeFilterCount > 0 && (
                    <Badge variant="soft">{activeFilterCount} active</Badge>
                  )}
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
                        <Badge variant="soft" className="ml-2">{activeFilterCount}</Badge>
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
              Showing {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
            </p>

            {/* Vendor Grid */}
            {filteredVendors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVendors.map((vendor, index) => (
                  <VendorCard key={vendor._id} vendor={vendor} index={index} />
                ))}
              </div>
            ) : (
              <Card className="py-16 text-center">
                <CardContent>
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No vendors found
                  </h3>
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
