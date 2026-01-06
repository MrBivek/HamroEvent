import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Search, Filter, MessageSquare, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';

const mockBookings = [
  {
    id: '1',
    vendorName: 'Himalayan Moments Photography',
    vendorImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200',
    category: 'Photography',
    eventType: 'Wedding',
    date: '2025-02-15',
    status: 'confirmed',
    price: 75000,
    location: 'Kathmandu',
  },
  {
    id: '2',
    vendorName: 'Grand Banquet Hall',
    vendorImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=200',
    category: 'Venue',
    eventType: 'Wedding',
    date: '2025-02-15',
    status: 'pending',
    price: 150000,
    location: 'Kathmandu',
  },
  {
    id: '3',
    vendorName: 'Spice Route Catering',
    vendorImage: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=200',
    category: 'Catering',
    eventType: 'Wedding',
    date: '2025-02-15',
    status: 'accepted',
    price: 100000,
    location: 'Lalitpur',
  },
  {
    id: '4',
    vendorName: 'Dream Decorators',
    vendorImage: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=200',
    category: 'Decoration',
    eventType: 'Birthday',
    date: '2025-03-20',
    status: 'completed',
    price: 50000,
    location: 'Bhaktapur',
  },
];

export default function CustomerBookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'accepted': return 'soft-secondary';
      case 'pending': return 'warning';
      case 'completed': return 'default';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'pending':
      case 'accepted':
        return <Clock className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredBookings = mockBookings.filter((booking) => {
    const matchesSearch = booking.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || booking.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="text-muted-foreground">Track and manage your vendor bookings</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start bg-muted/50 p-1">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredBookings.length > 0 ? (
            <div className="space-y-4">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="interactive">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <img
                          src={booking.vendorImage}
                          alt={booking.vendorName}
                          className="w-full sm:w-24 h-24 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold text-foreground">{booking.vendorName}</h3>
                              <p className="text-sm text-muted-foreground">{booking.category}</p>
                            </div>
                            <Badge variant={getStatusVariant(booking.status) as any} className="capitalize gap-1">
                              {getStatusIcon(booking.status)}
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(booking.date).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                              })}
                            </span>
                            <span>{booking.eventType}</span>
                            <span>{booking.location}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              NPR {booking.price.toLocaleString()}
                            </span>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/customer/bookings/${booking.id}`}>
                                <MessageSquare className="h-4 w-4 mr-1" />
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="py-16 text-center">
              <CardContent>
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No bookings found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try adjusting your search' : 'Start by browsing vendors'}
                </p>
                <Button variant="hero" asChild>
                  <Link to="/vendors">Browse Vendors</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
