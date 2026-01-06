import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, Check, X, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { useToast } from '@/hooks/use-toast.ts';

const mockBookings = [
  { id: '1', customer: 'Sita Sharma', event: 'Wedding', date: '2025-02-15', status: 'pending', price: 75000 },
  { id: '2', customer: 'Ram Thapa', event: 'Birthday', date: '2025-03-20', status: 'accepted', price: 35000 },
  { id: '3', customer: 'Maya Gurung', event: 'Corporate', date: '2025-04-10', status: 'confirmed', price: 50000 },
];

export default function VendorBookings() {
  const { toast } = useToast();

  const handleAccept = (id: string) => toast({ title: 'Booking accepted' });
  const handleReject = (id: string) => toast({ title: 'Booking rejected' });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'accepted': return 'soft-secondary';
      case 'pending': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-muted-foreground">Manage your booking requests</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6 space-y-4">
          {mockBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{booking.customer}</span>
                    <Badge variant={getStatusVariant(booking.status) as any} className="capitalize">{booking.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{booking.event}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{booking.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">NPR {booking.price.toLocaleString()}</span>
                  {booking.status === 'pending' && (
                    <>
                      <Button size="sm" variant="success" onClick={() => handleAccept(booking.id)}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleReject(booking.id)}><X className="h-4 w-4" /></Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" asChild><Link to={`/vendor/bookings/${booking.id}`}><MessageSquare className="h-4 w-4" /></Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="pending" className="mt-6"><p className="text-muted-foreground">Pending bookings will appear here</p></TabsContent>
        <TabsContent value="confirmed" className="mt-6"><p className="text-muted-foreground">Confirmed bookings will appear here</p></TabsContent>
      </Tabs>
    </div>
  );
}
