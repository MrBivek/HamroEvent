import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, DollarSign, Users, Plus, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';

const mockEvent = {
  id: '1',
  title: 'Wedding Celebration',
  eventType: 'Wedding',
  date: '2025-02-15',
  location: 'Kathmandu',
  notes: 'Grand wedding celebration with family and friends. Expecting around 300 guests.',
  budget: 500000,
  createdAt: '2024-12-01',
  bookings: [
    { id: '1', vendorName: 'Himalayan Moments Photography', category: 'Photography', status: 'confirmed', price: 75000 },
    { id: '2', vendorName: 'Grand Banquet Hall', category: 'Venue', status: 'pending', price: 150000 },
    { id: '3', vendorName: 'Spice Route Catering', category: 'Catering', status: 'accepted', price: 100000 },
    { id: '4', vendorName: 'Dream Decorators', category: 'Decoration', status: 'confirmed', price: 50000 },
    { id: '5', vendorName: 'Glow Beauty Studio', category: 'Makeup', status: 'confirmed', price: 45000 },
  ],
};

export default function CustomerEventDetail() {
  const { id } = useParams();
  const event = mockEvent; // In real app, fetch by id

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'accepted': return 'soft-secondary';
      case 'pending': return 'warning';
      default: return 'outline';
    }
  };

  const totalSpent = event.bookings.reduce((sum, b) => sum + b.price, 0);
  const remainingBudget = event.budget - totalSpent;

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
          <Badge variant="soft" className="mb-2">{event.eventType}</Badge>
          <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.location}
            </span>
          </div>
        </div>
        <Button variant="hero" asChild>
          <Link to="/vendors">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Link>
        </Button>
      </div>

      {/* Budget Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-soft flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-lg font-semibold text-foreground">NPR {event.budget.toLocaleString()}</p>
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
                <p className="text-lg font-semibold text-foreground">NPR {totalSpent.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                remainingBudget >= 0 ? 'bg-success-soft' : 'bg-destructive-soft'
              }`}>
                <DollarSign className={`h-5 w-5 ${remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className={`text-lg font-semibold ${remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`}>
                  NPR {remainingBudget.toLocaleString()}
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

      {/* Linked Bookings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Linked Vendors ({event.bookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {event.bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{booking.vendorName}</span>
                    <Badge variant={getStatusVariant(booking.status) as any} className="capitalize">
                      {booking.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{booking.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">NPR {booking.price.toLocaleString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/customer/bookings/${booking.id}`}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
