import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Calendar } from '@/components/ui/calendar.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { motion, AnimatePresence } from 'framer-motion';

const mockBookings = [
  { id: '1', customer: 'Sita Sharma', event: 'Wedding', date: new Date(2025, 1, 15), time: '10:00 AM - 6:00 PM', location: 'Kathmandu', status: 'confirmed' },
  { id: '2', customer: 'Ram Thapa', event: 'Birthday', date: new Date(2025, 2, 20), time: '2:00 PM - 8:00 PM', location: 'Pokhara', status: 'confirmed' },
  { id: '3', customer: 'Maya Gurung', event: 'Corporate', date: new Date(2025, 3, 10), time: '9:00 AM - 5:00 PM', location: 'Lalitpur', status: 'pending' },
];

const mockBlockedDates = [
  { date: new Date(2025, 1, 20), reason: 'Personal' },
  { date: new Date(2025, 2, 5), reason: 'Vacation' },
];

export default function VendorAvailability() {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [blockedDates, setBlockedDates] = useState(mockBlockedDates);
  const [blockReason, setBlockReason] = useState('');
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const bookedDates = mockBookings.map(b => b.date);

  const handleBlockDate = () => {
    if (!selectedDate) return;
    setBlockedDates([...blockedDates, { date: selectedDate, reason: blockReason }]);
    setBlockReason('');
    setIsBlockDialogOpen(false);
    toast({ title: 'Date Blocked', description: `${selectedDate.toLocaleDateString()} has been blocked.` });
  };

  const handleUnblockDate = (dateToUnblock: Date) => {
    setBlockedDates(blockedDates.filter(b => b.date.getTime() !== dateToUnblock.getTime()));
    toast({ title: 'Date Unblocked' });
  };

  const getDateStatus = (date: Date) => {
    const isBooked = bookedDates.some(d => d.toDateString() === date.toDateString());
    const isBlocked = blockedDates.some(d => d.date.toDateString() === date.toDateString());
    if (isBooked) return 'booked';
    if (isBlocked) return 'blocked';
    return 'available';
  };

  const getBookingForDate = (date: Date) => {
    return mockBookings.find(b => b.date.toDateString() === date.toDateString());
  };

  const upcomingBookings = mockBookings
    .filter(b => b.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
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
                  disabled={(date) => date < new Date() || bookedDates.some(d => d.toDateString() === date.toDateString())}
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
              <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleBlockDate} disabled={!selectedDate}>Block Date</Button>
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
                blocked: blockedDates.map(b => b.date),
              }}
              modifiersClassNames={{
                booked: 'bg-primary text-primary-foreground hover:bg-primary',
                blocked: 'bg-muted text-muted-foreground line-through',
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
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h4>
                {getDateStatus(selectedDate) === 'booked' ? (
                  <div className="space-y-2">
                    <Badge variant="success">Booked</Badge>
                    {(() => {
                      const booking = getBookingForDate(selectedDate);
                      return booking ? (
                        <div className="text-sm space-y-1 text-muted-foreground">
                          <p className="flex items-center gap-2"><User className="h-4 w-4" /> {booking.customer}</p>
                          <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {booking.time}</p>
                          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {booking.location}</p>
                          <Button variant="outline" size="sm" className="mt-2" asChild>
                            <Link to={`/vendor/bookings/${booking.id}`}>View Booking</Link>
                          </Button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : getDateStatus(selectedDate) === 'blocked' ? (
                  <div className="space-y-2">
                    <Badge variant="outline">Blocked</Badge>
                    <p className="text-sm text-muted-foreground">
                      {blockedDates.find(b => b.date.toDateString() === selectedDate.toDateString())?.reason || 'No reason provided'}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleUnblockDate(selectedDate)}>
                      <X className="h-4 w-4 mr-2" /> Unblock
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="soft-success">Available</Badge>
                    <p className="text-sm text-muted-foreground">This date is available for bookings.</p>
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
                {upcomingBookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <Link to={`/vendor/bookings/${booking.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground text-sm">{booking.customer}</p>
                        <Badge variant={booking.status === 'confirmed' ? 'success' : 'warning'} className="text-xs capitalize">
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{booking.event}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {booking.time.split(' - ')[0]}
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
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {blocked.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {blocked.reason && <p className="text-xs text-muted-foreground">{blocked.reason}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleUnblockDate(blocked.date)}>
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
