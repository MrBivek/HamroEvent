import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Star,
    MapPin,
    Phone,
    Mail,
    Globe,
    Instagram,
    Facebook,
    BadgeCheck,
    Heart,
    Share2,
    Calendar,
    Clock,
    Check,
    ArrowLeft,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useShortlistStore } from "@/store/shortlistStore.ts";
import { useAuthStore } from "@/store/authStore.ts";
import { MarketplaceService } from "@/services/MarketplaceService";
import { EventsService } from "@/services/EventsService";
import { BookingsService } from "@/services/BookingsService";
import { ReviewsService } from "@/services/ReviewsService";
import { getCategoryMeta } from "@/data/catalog";
import { getErrorMessage, resolveMediaUrl } from "@/lib/api";
import { fetchVendorAvailability } from "@/lib/vendors.ts";
import { useToast } from "@/hooks/use-toast.ts";
import { format } from "date-fns";
import type { Review, VendorProfile, Event, Booking } from "@/types";

export default function VendorDetailPage() {
    const { id } = useParams();
    const { isShortlisted, addToShortlist, removeFromShortlist } = useShortlistStore();
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [vendor, setVendor] = useState<VendorProfile | null>(null);
    const [vendorReviews, setVendorReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [events, setEvents] = useState<Event[]>([]);
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [selectedPackageId, setSelectedPackageId] = useState("none");
    const [bookingNote, setBookingNote] = useState("");
    const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
    const canBook = user?.role === "customer";

    useEffect(() => {
        let active = true;
        const load = async () => {
            if (!id) {
                setIsLoading(false);
                return;
            }
            try {
                const [vendorRes, reviewsRes] = await Promise.all([
                    MarketplaceService.getApiVendors1({ id }),
                    ReviewsService.getApiReviews({ vendorId: id, limit: 50 })
                ]);
                if (!active) return;
                setVendor(vendorRes || null);
                setVendorReviews(reviewsRes?.items || []);
            } catch {
                if (!active) return;
                setVendor(null);
                setVendorReviews([]);
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
        const loadEvents = async () => {
            if (!canBook) return;
            try {
                const res = await EventsService.getApiEvents({ page: 1, limit: 50 });
                if (!active) return;
                setEvents(res?.items || []);
                if (!selectedEventId && res?.items?.length) {
                    setSelectedEventId(res.items[0]._id);
                }
            } catch {
                if (!active) return;
                setEvents([]);
            }
        };
        loadEvents();
        return () => {
            active = false;
        };
    }, [canBook, selectedEventId]);

    useEffect(() => {
        let active = true;
        const loadAvailability = async () => {
            if (!id) return;
            setIsAvailabilityLoading(true);
            try {
                const today = new Date();
                const from = today.toISOString().slice(0, 10);
                const to = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                const res = await fetchVendorAvailability({ vendorId: id, from, to });
                if (!active) return;
                setAvailableDates(res.availableDates || []);
            } catch {
                if (!active) return;
                setAvailableDates([]);
            } finally {
                if (active) setIsAvailabilityLoading(false);
            }
        };
        loadAvailability();
        return () => {
            active = false;
        };
    }, [id]);

    if (isLoading) {
        return (
            <div className="container py-16 text-center">
                <p className="text-muted-foreground">Loading vendor...</p>
            </div>
        );
    }

    if (!vendor && !isLoading) {
        return (
            <div className="container py-16 text-center">
                <h1 className="text-2xl font-bold text-foreground mb-4">Vendor not found</h1>
                <Button asChild>
                    <Link to="/vendors">Back to Vendors</Link>
                </Button>
            </div>
        );
    }

    const shortlisted = isShortlisted(vendor._id);
    const categoryInfo = getCategoryMeta(vendor.category);
    const galleryImages =
        vendor.portfolioMedia && vendor.portfolioMedia.length > 0 ? vendor.portfolioMedia : [resolveMediaUrl(null)];
    const isVendorUser = user?.role === "vendor";
    const isAdminUser = user?.role === "admin";
    const bookingDisabled = isVendorUser || isAdminUser;
    const canShortlist = user?.role === "customer";
    const shortlistDisabled = Boolean(user) && !canShortlist;

    const handleShortlist = async () => {
        if (!user) {
            navigate(`/login?redirect=/vendors/${vendor._id}`);
            return;
        }
        if (!canShortlist) {
            toast({
                title: "Shortlist available for customers only",
                description: "Switch to a customer account to use shortlist.",
                variant: "default"
            });
            return;
        }
        if (shortlisted) {
            await removeFromShortlist(vendor._id);
        } else {
            await addToShortlist(vendor._id);
        }
    };

    const openBooking = (packageId?: string) => {
        if (!user) {
            navigate(`/login?redirect=/vendors/${vendor._id}`);
            return;
        }
        if (!canBook) {
            toast({
                title: "Booking available for customers only",
                description: "Switch to a customer account to request bookings.",
                variant: "default"
            });
            return;
        }
        setSelectedPackageId(packageId || "none");
        setIsBookingOpen(true);
    };

    const handleBookingSubmit = async () => {
        if (!selectedEventId) {
            toast({ title: "Select an event", variant: "destructive" });
            return;
        }
        setIsBookingSubmitting(true);
        try {
            const created = (await BookingsService.postApiBookings({
                requestBody: {
                    vendorId: vendor._id,
                    eventId: selectedEventId,
                    packageId: selectedPackageId === "none" ? undefined : selectedPackageId,
                    customerNote: bookingNote || undefined
                }
            })) as Booking;
            toast({ title: "Booking requested", description: "The vendor has been notified." });
            setIsBookingOpen(false);
            setBookingNote("");
            if (created?._id) {
                navigate(`/customer/bookings/${created._id}`);
            } else {
                navigate("/customer/bookings");
            }
        } catch (error) {
            toast({
                title: "Failed to request booking",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        } finally {
            setIsBookingSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Image Gallery */}
            <div className="relative h-64 md:h-96 bg-muted overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-4 gap-1">
                    {galleryImages.slice(0, 4).map((img, i) => (
                        <div key={i} className={`relative ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                            <img
                                src={resolveMediaUrl(img)}
                                alt={`${vendor.businessName} portfolio ${i + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />

                {/* Back Button */}
                <Link
                    to="/vendors"
                    className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-card/80 backdrop-blur-sm text-foreground hover:bg-card transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Vendors</span>
                </Link>

                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <Button
                        variant="hero-outline"
                        size="icon"
                        className="bg-card/80 backdrop-blur-sm"
                        onClick={handleShortlist}
                        disabled={shortlistDisabled}
                        title={shortlistDisabled ? "Shortlist is available for customers only" : "Shortlist"}
                    >
                        <Heart className={`h-4 w-4 ${shortlisted ? "fill-destructive text-destructive" : ""}`} />
                    </Button>
                    <Button variant="hero-outline" size="icon" className="bg-card/80 backdrop-blur-sm">
                        <Share2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="container py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header */}
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="soft-secondary" className="capitalize">
                                    {categoryInfo?.icon} {(vendor.category || "service").replace("-", " & ")}
                                </Badge>
                                {vendor.verificationStatus === "verified" && (
                                    <Badge variant="verified" className="gap-1">
                                        <BadgeCheck className="h-3 w-3" />
                                        Verified
                                    </Badge>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                                {vendor.businessName}
                            </h1>

                            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="h-5 w-5 fill-warning text-warning" />
                                    <span className="font-semibold text-foreground">{vendor.ratingAvg.toFixed(1)}</span>
                                    <span>({vendor.ratingCount} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{vendor.location}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs defaultValue="about" className="w-full">
                            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-4">
                                <TabsTrigger
                                    value="about"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
                                >
                                    About
                                </TabsTrigger>
                                <TabsTrigger
                                    value="packages"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
                                >
                                    Packages
                                </TabsTrigger>
                                <TabsTrigger
                                    value="portfolio"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
                                >
                                    Portfolio
                                </TabsTrigger>
                                <TabsTrigger
                                    value="reviews"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-3"
                                >
                                    Reviews ({vendorReviews.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="about" className="mt-6 space-y-6">
                                <div>
                                    <h3 className="font-semibold text-foreground mb-3">About Us</h3>
                                    <p className="text-muted-foreground leading-relaxed">{vendor.description}</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-foreground mb-3">Service Areas</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {vendor.serviceAreas.map((area) => (
                                            <Badge key={area} variant="outline">
                                                {area}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="packages" className="mt-6">
                                <div className="grid gap-4">
                                    {vendor.packages.map((pkg) => (
                                        <Card key={pkg._id}>
                                            <CardContent className="p-6">
                                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-foreground mb-2">
                                                            {pkg.name}
                                                        </h3>
                                                        <p className="text-muted-foreground mb-4">{pkg.description}</p>

                                                        <div className="space-y-2">
                                                            {pkg.inclusions.map((item, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="flex items-center gap-2 text-sm"
                                                                >
                                                                    <Check className="h-4 w-4 text-success" />
                                                                    <span>{item}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {pkg.duration && (
                                                            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                                                                <Clock className="h-4 w-4" />
                                                                <span>{pkg.duration}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <div className="text-2xl font-bold text-foreground">
                                                            NPR {pkg.priceMin.toLocaleString()}
                                                            {pkg.priceMax && pkg.priceMax !== pkg.priceMin && (
                                                                <span className="text-base font-normal text-muted-foreground">
                                                                    {" "}
                                                                    - {pkg.priceMax.toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Button
                                                            className="mt-3"
                                                            variant="hero"
                                                            onClick={() => openBooking(pkg._id)}
                                                            disabled={bookingDisabled}
                                                        >
                                                            Select Package
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="portfolio" className="mt-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {vendor.portfolioMedia.map((img, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="aspect-square rounded-xl overflow-hidden"
                                        >
                                            <img
                                                src={resolveMediaUrl(img)}
                                                alt={`Portfolio ${i + 1}`}
                                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="reviews" className="mt-6">
                                {vendorReviews.length > 0 ? (
                                    <div className="space-y-4">
                                        {vendorReviews.map((review) => (
                                            <Card key={review._id}>
                                                <CardContent className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        <img
                                                            src={resolveMediaUrl(null)}
                                                            alt=""
                                                            className="h-10 w-10 rounded-full"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-foreground">
                                                                    {review.customer?.name || "Customer"}
                                                                </span>
                                                                <span className="text-sm text-muted-foreground">
                                                                    {new Date(review.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 mb-2">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        className={`h-4 w-4 ${
                                                                            i < review.rating
                                                                                ? "fill-warning text-warning"
                                                                                : "text-muted"
                                                                        }`}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <p className="text-muted-foreground">{review.comment}</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="py-12 text-center">
                                        <CardContent>
                                            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="font-semibold text-foreground mb-2">No reviews yet</h3>
                                            <p className="text-muted-foreground">Be the first to review this vendor</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Booking Card */}
                        <Card className="sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-lg">Book This Vendor</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-border">
                                    <span className="text-muted-foreground">Starting from</span>
                                    <span className="text-2xl font-bold text-foreground">
                                        NPR {vendor.pricingRange.min.toLocaleString()}
                                    </span>
                                </div>

                                {bookingDisabled ? (
                                    <Button variant="outline" size="lg" className="w-full" disabled>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Booking for customers only
                                    </Button>
                                ) : (
                                    <Button variant="hero" size="lg" className="w-full" onClick={() => openBooking()}>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Request Booking
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                    onClick={handleShortlist}
                                    disabled={shortlistDisabled}
                                >
                                    <Heart
                                        className={`mr-2 h-4 w-4 ${shortlisted ? "fill-destructive text-destructive" : ""}`}
                                    />
                                    {shortlistDisabled
                                        ? "Shortlist for customers only"
                                        : shortlisted
                                          ? "Remove from Shortlist"
                                          : "Add to Shortlist"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Contact Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Contact Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <a
                                    href={`tel:${vendor.contact.phone}`}
                                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Phone className="h-4 w-4" />
                                    <span>{vendor.contact.phone}</span>
                                </a>
                                <a
                                    href={`mailto:${vendor.contact.email}`}
                                    className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Mail className="h-4 w-4" />
                                    <span>{vendor.contact.email}</span>
                                </a>
                                {vendor.socialLinks?.website && (
                                    <a
                                        href={vendor.socialLinks.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Globe className="h-4 w-4" />
                                        <span>Website</span>
                                    </a>
                                )}
                                {vendor.socialLinks?.instagram && (
                                    <a
                                        href={`https://instagram.com/${vendor.socialLinks.instagram.replace("@", "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Instagram className="h-4 w-4" />
                                        <span>{vendor.socialLinks.instagram}</span>
                                    </a>
                                )}
                                {vendor.socialLinks?.facebook && (
                                    <a
                                        href={`https://facebook.com/${vendor.socialLinks.facebook}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Facebook className="h-4 w-4" />
                                        <span>{vendor.socialLinks.facebook}</span>
                                    </a>
                                )}
                            </CardContent>
                        </Card>

                        {/* Availability */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Available Dates</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {isAvailabilityLoading ? (
                                    <p className="text-sm text-muted-foreground">Loading availability...</p>
                                ) : availableDates.length > 0 ? (
                                    <>
                                        <div className="flex flex-wrap gap-2">
                                            {availableDates.slice(0, 8).map((date) => (
                                                <Badge key={date} variant="soft">
                                                    {format(new Date(`${date}T00:00:00Z`), "MMM d")}
                                                </Badge>
                                            ))}
                                        </div>
                                        {availableDates.length > 8 && (
                                            <p className="text-xs text-muted-foreground">
                                                {availableDates.length - 8} more available dates in the next 30 days
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No availability info yet. Please contact the vendor for scheduling.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request Booking</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Select Event</label>
                            {events.length === 0 ? (
                                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                                    You don’t have any events yet. Create an event first.
                                    <div className="mt-3">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link to="/customer/events">Create Event</Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {events.map((event) => (
                                            <SelectItem key={event._id} value={event._id}>
                                                {event.title} • {new Date(event.date).toLocaleDateString()}
                                                {event.startTime && event.endTime
                                                    ? ` • ${event.startTime}-${event.endTime}`
                                                    : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Package (optional)</label>
                            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select package" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No package selected</SelectItem>
                                    {vendor.packages.map((pkg) => (
                                        <SelectItem key={pkg._id} value={pkg._id}>
                                            {pkg.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Note (optional)</label>
                            <Textarea
                                placeholder="Share details for the vendor..."
                                value={bookingNote}
                                onChange={(e) => setBookingNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="hero"
                            onClick={handleBookingSubmit}
                            disabled={isBookingSubmitting || events.length === 0}
                        >
                            {isBookingSubmitting ? "Sending..." : "Send Request"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
