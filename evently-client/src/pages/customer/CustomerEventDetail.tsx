import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, DollarSign, Users, Plus, MessageSquare, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { EventsService } from "@/services/EventsService";
import { CatalogService } from "@/services/CatalogService";
import { PaymentsService } from "@/services/PaymentsService";
import { fetchAvailableVendors } from "@/lib/vendors.ts";
import { resolveMediaUrl } from "@/lib/api";
import type { BadgeProps } from "@/components/ui/badge.tsx";
import type { Booking, Category, Event, Location, Payment, VendorProfile } from "@/types";

export default function CustomerEventDetail() {
    const { id } = useParams();
    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVendorPickerOpen, setIsVendorPickerOpen] = useState(false);
    const [availableVendors, setAvailableVendors] = useState<VendorProfile[]>([]);
    const [isVendorsLoading, setIsVendorsLoading] = useState(false);
    const [vendorQuery, setVendorQuery] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [locationFilter, setLocationFilter] = useState("all");
    const [minRatingFilter, setMinRatingFilter] = useState("any");
    const [priceMinFilter, setPriceMinFilter] = useState("");
    const [priceMaxFilter, setPriceMaxFilter] = useState("");
    const [sortBy, setSortBy] = useState("rating");
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isPaymentsLoading, setIsPaymentsLoading] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id) return;
            try {
                const res = await EventsService.getApiEvents1({ id });
                if (!active) return;
                setEvent(res || null);
            } catch {
                if (!active) return;
                setEvent(null);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        const loadPayments = async () => {
            if (!id) return;
            setIsPaymentsLoading(true);
            try {
                const res = await PaymentsService.getApiPayments({ eventId: id, page: 1, limit: 50 });
                if (!active) return;
                setPayments(res?.items || []);
            } catch {
                if (!active) return;
                setPayments([]);
            } finally {
                if (active) setIsPaymentsLoading(false);
            }
        };
        loadPayments();
        return () => {
            active = false;
        };
    }, [id]);

    useEffect(() => {
        let active = true;
        if (!isVendorPickerOpen) return () => undefined;
        const loadCatalog = async () => {
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
        loadCatalog();
        return () => {
            active = false;
        };
    }, [isVendorPickerOpen]);

    useEffect(() => {
        let active = true;
        if (!event || !isVendorPickerOpen) return () => undefined;
        const handle = setTimeout(() => {
            const loadVendors = async () => {
                setIsVendorsLoading(true);
                try {
                    const date = event.date?.slice(0, 10);
                    const minRating = minRatingFilter === "any" ? undefined : Number(minRatingFilter);
                    const priceMin = priceMinFilter.trim() === "" ? undefined : Number(priceMinFilter);
                    const priceMax = priceMaxFilter.trim() === "" ? undefined : Number(priceMaxFilter);
                    const res = await fetchAvailableVendors({
                        date,
                        startTime: event.startTime || undefined,
                        endTime: event.endTime || undefined,
                        q: vendorQuery.trim() || undefined,
                        category: categoryFilter === "all" ? undefined : categoryFilter,
                        location: locationFilter === "all" ? undefined : locationFilter,
                        minRating: Number.isNaN(minRating) ? undefined : minRating,
                        priceMin: Number.isNaN(priceMin) ? undefined : priceMin,
                        priceMax: Number.isNaN(priceMax) ? undefined : priceMax,
                        sortBy,
                        page: 1,
                        limit: 24
                    });
                    if (!active) return;
                    setAvailableVendors(res.items || []);
                } catch {
                    if (!active) return;
                    setAvailableVendors([]);
                } finally {
                    if (active) setIsVendorsLoading(false);
                }
            };
            loadVendors();
        }, 250);
        return () => {
            active = false;
            clearTimeout(handle);
        };
    }, [
        event,
        isVendorPickerOpen,
        vendorQuery,
        categoryFilter,
        locationFilter,
        minRatingFilter,
        priceMinFilter,
        priceMaxFilter,
        sortBy
    ]);

    if (isLoading) {
        return (
            <div className="container py-16 text-center">
                <p className="text-muted-foreground">Loading event...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Event not found</h1>
                <Button asChild>
                    <Link to="/customer/events">Back to Events</Link>
                </Button>
            </div>
        );
    }

    const getStatusVariant = (status: string): BadgeProps["variant"] => {
        switch (status) {
            case "confirmed":
                return "success";
            case "accepted":
                return "soft-secondary";
            case "pending":
                return "warning";
            default:
                return "outline";
        }
    };

    const resetVendorFilters = () => {
        setVendorQuery("");
        setCategoryFilter("all");
        setLocationFilter("all");
        setMinRatingFilter("any");
        setPriceMinFilter("");
        setPriceMaxFilter("");
        setSortBy("rating");
    };

    const totalSpent = (event.bookings || []).reduce((sum: number, b: Booking) => sum + (b.price || 0), 0);
    const remainingBudget = (event.budget || 0) - totalSpent;
    const totalPaid = payments
        .filter((p) => String(p.status).toUpperCase() === "PAID")
        .reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <Link
                to="/customer/events"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Events
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <Badge variant="soft" className="mb-2">
                        {event.eventType}
                    </Badge>
                    <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(event.date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                                year: "numeric"
                            })}
                        </span>
                        {(event.startTime || event.endTime) && (
                            <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {event.startTime || "--:--"} - {event.endTime || "--:--"}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                        </span>
                    </div>
                </div>
                <Button variant="hero" onClick={() => setIsVendorPickerOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                </Button>
            </div>

            {/* Budget Overview */}
            <div className="grid sm:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Budget</p>
                                <p className="text-lg font-semibold text-foreground">
                                    NPR {(event.budget || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-warning-soft flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Spent</p>
                                <p className="text-lg font-semibold text-foreground">
                                    NPR {totalSpent.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div
                                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    remainingBudget >= 0 ? "bg-success-soft" : "bg-destructive-soft"
                                }`}
                            >
                                <DollarSign
                                    className={`h-5 w-5 ${remainingBudget >= 0 ? "text-success" : "text-destructive"}`}
                                />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Remaining</p>
                                <p
                                    className={`text-lg font-semibold ${remainingBudget >= 0 ? "text-success" : "text-destructive"}`}
                                >
                                    NPR {remainingBudget.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-success-soft flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Paid</p>
                                <p className="text-lg font-semibold text-foreground">
                                    NPR {totalPaid.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            {event.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{event.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Vendors & Payments */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Event Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="vendors">
                        <TabsList>
                            <TabsTrigger value="vendors">Linked Vendors</TabsTrigger>
                            <TabsTrigger value="payments">Payments</TabsTrigger>
                        </TabsList>

                        <TabsContent value="vendors" className="mt-4 space-y-3">
                            {(event.bookings || []).map((booking) => (
                                <div
                                    key={booking._id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-foreground">{booking.vendorName}</span>
                                            <Badge variant={getStatusVariant(booking.status)} className="capitalize">
                                                {booking.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">{booking.category}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-foreground">
                                            NPR {(booking.price || 0).toLocaleString()}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link to={`/customer/bookings/${booking._id}`}>
                                                    <MessageSquare className="h-4 w-4 mr-1" />
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </TabsContent>

                        <TabsContent value="payments" className="mt-4 space-y-3">
                            {isPaymentsLoading ? (
                                <p className="text-sm text-muted-foreground">Loading payments...</p>
                            ) : payments.length > 0 ? (
                                payments.map((payment) => (
                                    <div
                                        key={payment._id}
                                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {payment.vendorName || "Vendor"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {payment.provider} •{" "}
                                                {new Date(
                                                    payment.paidAt || payment.createdAt || ""
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-foreground">
                                                NPR {payment.amount.toLocaleString()}
                                            </p>
                                            <Badge
                                                variant={
                                                    String(payment.status).toUpperCase() === "PAID"
                                                        ? "success"
                                                        : "warning"
                                                }
                                                className="capitalize"
                                            >
                                                {String(payment.status).toLowerCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No payments yet.</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isVendorPickerOpen} onOpenChange={setIsVendorPickerOpen}>
                <DialogContent className="max-w-6xl p-0">
                    <div className="grid lg:grid-cols-[320px_1fr]">
                        <aside className="bg-muted/40 border-b lg:border-b-0 lg:border-r border-border p-6 space-y-6">
                            <div className="space-y-3">
                                <Badge variant="soft">{event.eventType}</Badge>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">{event.title}</h3>
                                    <p className="text-sm text-muted-foreground">Event overview</p>
                                </div>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        {new Date(event.date).toLocaleDateString("en-US", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        {event.startTime && event.endTime
                                            ? `${event.startTime} - ${event.endTime}`
                                            : "All day"}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {event.location}
                                    </span>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid gap-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Budget</span>
                                    <span className="font-medium text-foreground">
                                        NPR {(event.budget || 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Remaining</span>
                                    <span
                                        className={`font-medium ${remainingBudget >= 0 ? "text-success" : "text-destructive"}`}
                                    >
                                        NPR {remainingBudget.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Linked vendors</span>
                                    <span className="font-medium text-foreground">{event.bookings?.length || 0}</span>
                                </div>
                            </div>

                            {event.notes && (
                                <div className="rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">
                                    {event.notes}
                                </div>
                            )}

                            <Separator />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-foreground">Filters</h4>
                                    <Button variant="ghost" size="sm" onClick={resetVendorFilters}>
                                        Reset
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="vendor-search">Search</Label>
                                    <Input
                                        id="vendor-search"
                                        placeholder="Search vendors..."
                                        value={vendorQuery}
                                        onChange={(e) => setVendorQuery(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All categories</SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem
                                                    key={cat._id || cat.slug || cat.name}
                                                    value={cat.slug || cat.name}
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All locations" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All locations</SelectItem>
                                            {locations.map((loc) => (
                                                <SelectItem key={loc._id || loc.name} value={loc.name}>
                                                    {loc.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="price-min">Min price</Label>
                                        <Input
                                            id="price-min"
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            value={priceMinFilter}
                                            onChange={(e) => setPriceMinFilter(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="price-max">Max price</Label>
                                        <Input
                                            id="price-max"
                                            type="number"
                                            min={0}
                                            placeholder="Any"
                                            value={priceMaxFilter}
                                            onChange={(e) => setPriceMaxFilter(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Minimum rating</Label>
                                    <Select value={minRatingFilter} onValueChange={setMinRatingFilter}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Any rating" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="any">Any rating</SelectItem>
                                            <SelectItem value="4">4+ stars</SelectItem>
                                            <SelectItem value="3">3+ stars</SelectItem>
                                            <SelectItem value="2">2+ stars</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Sort by</Label>
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sort by" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rating">Top rated</SelectItem>
                                            <SelectItem value="price-low">Price: low to high</SelectItem>
                                            <SelectItem value="price-high">Price: high to low</SelectItem>
                                            <SelectItem value="latest">Newest</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </aside>

                        <div className="p-6 flex flex-col min-h-[60vh]">
                            <DialogHeader className="mb-4">
                                <DialogTitle>Available Vendors</DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                    Vendors available for your event date and time.
                                </p>
                            </DialogHeader>

                            <div className="flex items-center justify-between gap-3 mb-4">
                                <Badge variant="soft">
                                    {event.startTime && event.endTime
                                        ? `${event.startTime}-${event.endTime}`
                                        : "All day"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {availableVendors.length} vendors found
                                </span>
                            </div>

                            {isVendorsLoading ? (
                                <div className="py-12 text-center text-muted-foreground">Loading vendors...</div>
                            ) : availableVendors.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    No available vendors found for this date/time.
                                </div>
                            ) : (
                                <ScrollArea className="flex-1 pr-3">
                                    <div className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4">
                                        {availableVendors.map((vendor) => (
                                            <Card key={vendor._id} variant="interactive" className="overflow-hidden">
                                                <div className="h-36 w-full overflow-hidden">
                                                    <img
                                                        src={resolveMediaUrl(vendor.portfolioMedia?.[0])}
                                                        alt={vendor.businessName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-foreground truncate">
                                                                {vendor.businessName}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground truncate">
                                                                {vendor.category} • {vendor.location}
                                                            </p>
                                                        </div>
                                                        <Badge variant="soft">
                                                            {vendor.pricingRange?.max &&
                                                            vendor.pricingRange.max > vendor.pricingRange.min
                                                                ? `NPR ${vendor.pricingRange.min.toLocaleString()} - ${vendor.pricingRange.max.toLocaleString()}`
                                                                : `NPR ${vendor.pricingRange?.min?.toLocaleString() ?? 0}+`}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Star className="h-4 w-4 fill-warning text-warning" />
                                                            {vendor.ratingAvg.toFixed(1)}
                                                        </span>
                                                        <span>{vendor.ratingCount} reviews</span>
                                                    </div>
                                                    {vendor.serviceAreas?.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {vendor.serviceAreas.slice(0, 3).map((area) => (
                                                                <Badge key={area} variant="outline" className="text-xs">
                                                                    {area}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <Button variant="outline" className="w-full" asChild>
                                                        <Link to={`/vendors/${vendor._id}`}>View Vendor</Link>
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
