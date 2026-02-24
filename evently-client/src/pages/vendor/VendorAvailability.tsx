import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Calendar } from "@/components/ui/calendar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { motion, AnimatePresence } from "framer-motion";
import { AvailabilityService } from "@/services/AvailabilityService";
import { VendorBookingsService } from "@/services/VendorBookingsService";
import { getErrorMessage } from "@/lib/api";
import type { AvailabilityEntry, Booking } from "@/types";

export default function VendorAvailability() {
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [blockedDates, setBlockedDates] = useState<{ date: Date; reason?: string }[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [blockReason, setBlockReason] = useState("");
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
                const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                const [availabilityRes, bookingsRes] = await Promise.all([
                    AvailabilityService.getApiVendorsMeAvailability({
                        from: start.toISOString().slice(0, 10),
                        to: end.toISOString().slice(0, 10),
                        limit: 200
                    }),
                    VendorBookingsService.getApiVendorsMeBookings({ page: 1, limit: 100 })
                ]);
                if (!active) return;
                const items = availabilityRes?.items || [];
                const blocked = items
                    .filter((item: AvailabilityEntry) => item.isAvailable === false)
                    .map((item: AvailabilityEntry) => ({
                        date: new Date(item.date),
                        reason: item.note || ""
                    }));
                setBlockedDates(blocked);
                setBookings(bookingsRes?.items || []);
            } catch {
                if (!active) return;
                setBlockedDates([]);
                setBookings([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, [currentMonth]);

    const bookedDates = bookings
        .filter((b) => ["accepted", "confirmed"].includes(b.status))
        .map((b) => new Date(b.date));

    const handleBlockDate = async () => {
        if (!selectedDate) return;
        try {
            const dateStr = selectedDate.toISOString().slice(0, 10);
            await AvailabilityService.putApiVendorsMeAvailability({
                date: dateStr,
                requestBody: { isAvailable: false, note: blockReason || undefined }
            });
            setBlockedDates([...blockedDates, { date: selectedDate, reason: blockReason }]);
            setBlockReason("");
            setIsBlockDialogOpen(false);
            toast({ title: "Date Blocked", description: `${selectedDate.toLocaleDateString()} has been blocked.` });
        } catch (error) {
            toast({
                title: "Failed to block date",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleUnblockDate = async (dateToUnblock: Date) => {
        try {
            const dateStr = dateToUnblock.toISOString().slice(0, 10);
            await AvailabilityService.deleteApiVendorsMeAvailability({ date: dateStr });
            setBlockedDates(blockedDates.filter((b) => b.date.getTime() !== dateToUnblock.getTime()));
            toast({ title: "Date Unblocked" });
        } catch (error) {
            toast({
                title: "Failed to unblock date",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const getDateStatus = (date: Date) => {
        const isBooked = bookedDates.some((d) => d.toDateString() === date.toDateString());
        const isBlocked = blockedDates.some((d) => d.date.toDateString() === date.toDateString());
        if (isBooked) return "booked";
        if (isBlocked) return "blocked";
        return "available";
    };

    const getBookingForDate = (date: Date) => {
        return bookings.find((b) => new Date(b.date).toDateString() === date.toDateString());
    };

    const upcomingBookings = bookings
        .filter((b) => new Date(b.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Availability</h1>
                    <p className="text-muted-foreground">Manage your calendar and blocked dates</p>
                </div>
                <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" /> Block Date
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Block a Date</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Select Date</Label>
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    disabled={(date) =>
                                        date < new Date() ||
                                        bookedDates.some((d) => d.toDateString() === date.toDateString())
                                    }
                                    className="rounded-md border mt-2"
                                />
                            </div>
                            <div>
                                <Label>Reason (optional)</Label>
                                <Textarea
                                    placeholder="e.g., Personal, Vacation, Holiday..."
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleBlockDate} disabled={!selectedDate}>
                                Block Date
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg">Calendar View</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            className="rounded-md border p-4"
                            modifiers={{
                                booked: bookedDates,
                                blocked: blockedDates.map((b) => b.date)
                            }}
                            modifiersClassNames={{
                                booked: "bg-primary text-primary-foreground hover:bg-primary",
                                blocked: "bg-muted text-muted-foreground line-through"
                            }}
                        />
                        <div className="flex flex-wrap gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-primary" />
                                <span>Booked</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-muted" />
                                <span>Blocked</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-success" />
                                <span>Available</span>
                            </div>
                        </div>

                        {/* Selected Date Details */}
                        {selectedDate && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-4 rounded-lg border border-border bg-card"
                            >
                                <h4 className="font-semibold text-foreground mb-2">
                                    {selectedDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </h4>
                                {getDateStatus(selectedDate) === "booked" ? (
                                    <div className="space-y-2">
                                        <Badge variant="success">Booked</Badge>
                                        {(() => {
                                            const booking = getBookingForDate(selectedDate);
                                            if (!booking) return null;
                                            const customerName =
                                                booking.customer?.name || booking.customerName || "Customer";
                                            const timeRange = booking.timeRange || { start: "--", end: "--" };
                                            return (
                                                <div className="text-sm space-y-1 text-muted-foreground">
                                                    <p className="flex items-center gap-2">
                                                        <User className="h-4 w-4" /> {customerName}
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4" /> {timeRange.start} -{" "}
                                                        {timeRange.end}
                                                    </p>
                                                    <p className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4" /> {booking.location || ""}
                                                    </p>
                                                    <Button variant="outline" size="sm" className="mt-2" asChild>
                                                        <Link to={`/vendor/bookings/${booking._id}`}>View Booking</Link>
                                                    </Button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                ) : getDateStatus(selectedDate) === "blocked" ? (
                                    <div className="space-y-2">
                                        <Badge variant="outline">Blocked</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            {blockedDates.find(
                                                (b) => b.date.toDateString() === selectedDate.toDateString()
                                            )?.reason || "No reason provided"}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleUnblockDate(selectedDate)}
                                        >
                                            <X className="h-4 w-4 mr-2" /> Unblock
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Badge variant="soft-success">Available</Badge>
                                        <p className="text-sm text-muted-foreground">
                                            This date is available for bookings.
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => setIsBlockDialogOpen(true)}>
                                            Block This Date
                                        </Button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Upcoming Bookings */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Upcoming Bookings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <AnimatePresence>
                                {upcomingBookings.map((booking, index: number) => (
                                    <motion.div
                                        key={booking._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                                    >
                                        <Link to={`/vendor/bookings/${booking._id}`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="font-medium text-foreground text-sm">
                                                    {booking.customer?.name || booking.customerName || "Customer"}
                                                </p>
                                                <Badge
                                                    variant={booking.status === "confirmed" ? "success" : "warning"}
                                                    className="text-xs capitalize"
                                                >
                                                    {booking.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {booking.eventType || booking.event || "Event"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(booking.date).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric"
                                                })}{" "}
                                                • {booking.timeRange?.start || "--"}
                                            </p>
                                        </Link>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {upcomingBookings.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No upcoming bookings</p>
                            )}
                            <Button variant="ghost" className="w-full" asChild>
                                <Link to="/vendor/bookings">View All Bookings</Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Blocked Dates */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Blocked Dates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {blockedDates.map((blocked, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {blocked.date.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </p>
                                        {blocked.reason && (
                                            <p className="text-xs text-muted-foreground">{blocked.reason}</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleUnblockDate(blocked.date)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            {blockedDates.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No blocked dates</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
