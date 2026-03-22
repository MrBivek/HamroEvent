import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Calendar, MapPin, Users, MoreVertical, Edit, Trash2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Calendar as DatePicker } from "@/components/ui/calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { useToast } from "@/hooks/use-toast.ts";
import { EventsService } from "@/services/EventsService";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils.ts";
import { format } from "date-fns";
import type { Event } from "@/types";

export default function CustomerEvents() {
    const [events, setEvents] = useState<Event[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const timeOptions = Array.from({ length: 48 }, (_, i) => {
        const hours = String(Math.floor(i / 2)).padStart(2, "0");
        const minutes = i % 2 === 0 ? "00" : "30";
        return `${hours}:${minutes}`;
    });
    const endTimeOptions = startTime ? timeOptions.filter((t) => t > startTime) : timeOptions;

    useEffect(() => {
        if (startTime && endTime && endTime <= startTime) {
            setEndTime("");
        }
    }, [startTime, endTime]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await EventsService.getApiEvents({ page: 1, limit: 50 });
                if (!active) return;
                setEvents(res?.items || []);
            } catch {
                if (!active) return;
                setEvents([]);
            } finally {
                if (active) setIsLoading(false);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (!selectedDate) {
            toast({ title: "Select a date", description: "Please choose the event date.", variant: "destructive" });
            return;
        }
        if (!startTime || !endTime) {
            toast({
                title: "Select time range",
                description: "Please choose both start and end time.",
                variant: "destructive"
            });
            return;
        }
        if (endTime <= startTime) {
            toast({
                title: "Invalid time range",
                description: "End time must be after start time.",
                variant: "destructive"
            });
            return;
        }
        const payload = {
            title: String(formData.get("title") || ""),
            eventType: String(formData.get("eventType") || ""),
            date: selectedDate.toISOString().slice(0, 10),
            startTime,
            endTime,
            location: String(formData.get("location") || ""),
            notes: String(formData.get("notes") || ""),
            budget: Number(formData.get("budget")) || undefined
        };
        try {
            const created = await EventsService.postApiEvents({ requestBody: payload });
            setEvents([created, ...events]);
            setIsDialogOpen(false);
            setSelectedDate(undefined);
            setStartTime("");
            setEndTime("");
            toast({ title: "Event created", description: `${payload.title} has been created.` });
        } catch (error) {
            toast({
                title: "Failed to create event",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await EventsService.deleteApiEvents({ id });
            setEvents(events.filter((e) => e._id !== id));
            toast({ title: "Event deleted", description: "The event has been removed." });
        } catch (error) {
            toast({
                title: "Failed to delete event",
                description: getErrorMessage(error, "Please try again."),
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">My Events</h1>
                    <p className="text-muted-foreground">Organize and manage your events</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="hero">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Event
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Event</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Event Title</Label>
                                <Input id="title" name="title" placeholder="e.g., Wedding Celebration" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="eventType">Event Type</Label>
                                    <Input id="eventType" name="eventType" placeholder="e.g., Wedding" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-between",
                                                    !selectedDate && "text-muted-foreground"
                                                )}
                                            >
                                                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                                                <Calendar className="h-4 w-4 opacity-60" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <DatePicker
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                disabled={(date) =>
                                                    date <
                                                    new Date(
                                                        new Date().getFullYear(),
                                                        new Date().getMonth(),
                                                        new Date().getDate()
                                                    )
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Select value={startTime} onValueChange={setStartTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select start time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map((time) => (
                                                <SelectItem key={time} value={time}>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>{time}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Select value={endTime} onValueChange={setEndTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select end time" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {endTimeOptions.map((time) => (
                                                <SelectItem key={time} value={time}>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>{time}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" name="location" placeholder="e.g., Kathmandu" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="budget">Budget (NPR)</Label>
                                    <Input id="budget" name="budget" type="number" placeholder="500000" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea id="notes" name="notes" placeholder="Additional details..." />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="hero">
                                    Create Event
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Events Grid */}
            {events.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                    {events.map((event, index) => (
                        <motion.div
                            key={event._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card variant="interactive">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <Badge variant="soft" className="mb-2">
                                                {event.eventType}
                                            </Badge>
                                            <h3 className="font-semibold text-foreground text-lg">{event.title}</h3>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-sm">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link to={`/customer/events/${event._id}`}>
                                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(event._id)}
                                                    className="text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            <span>
                                                {new Date(event.date).toLocaleDateString("en-US", {
                                                    weekday: "long",
                                                    month: "long",
                                                    day: "numeric",
                                                    year: "numeric"
                                                })}
                                            </span>
                                        </div>
                                        {(event.startTime || event.endTime) && (
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    {event.startTime || "--:--"} - {event.endTime || "--:--"}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            <span>
                                                {event.vendorCount ?? event.bookings?.length ?? 0} vendors booked
                                            </span>
                                        </div>
                                    </div>

                                    {event.budget > 0 && (
                                        <div className="pt-3 border-t border-border">
                                            <span className="text-sm text-muted-foreground">Budget: </span>
                                            <span className="font-semibold text-foreground">
                                                NPR {event.budget.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <Button variant="outline" className="w-full mt-4" asChild>
                                        <Link to={`/customer/events/${event._id}`}>View Details</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <CardContent>
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first event to start planning</p>
                        <Button variant="hero" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Event
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
