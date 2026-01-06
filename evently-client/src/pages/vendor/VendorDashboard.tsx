import { Link } from 'react-router-dom';
import { Calendar, Users, Star, Clock, BadgeCheck, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useAuthStore } from '@/store/authStore.ts';
import { mockVendors } from '@/data/mockData.ts';

export default function VendorDashboard() {
  const { user } = useAuthStore();
  const vendor = mockVendors[0]; // Mock current vendor

  const stats = [
    { label: 'Pending Requests', value: '3', icon: Clock, color: 'bg-warning-soft text-warning' },
    { label: 'Active Bookings', value: '5', icon: Calendar, color: 'bg-primary-soft text-primary' },
    { label: 'Completed', value: '127', icon: Users, color: 'bg-success-soft text-success' },
    { label: 'Rating', value: vendor.ratingAvg.toString(), icon: Star, color: 'bg-accent-soft text-accent' },
  ];

  const pendingBookings = [
    { id: '1', customer: 'Sita Sharma', event: 'Wedding', date: '2025-02-15', package: 'Premium' },
    { id: '2', customer: 'Ram Thapa', event: 'Birthday', date: '2025-03-20', package: 'Essential' },
  ];

  return (
    <div className="space-y-6">
      {/* Verification Banner */}
      {vendor.verificationStatus !== 'verified' && (
        <Card className="bg-warning-soft border-warning/20">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Complete Your Verification</p>
              <p className="text-sm text-muted-foreground">Verified vendors get more visibility and bookings</p>
            </div>
            <Button variant="warning" size="sm" asChild>
              <Link to="/vendor/verification">Verify Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here's your business overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color} mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Booking Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Pending Requests</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/vendor/bookings">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{booking.customer}</p>
                  <p className="text-sm text-muted-foreground">{booking.event} • {booking.package} Package</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{new Date(booking.date).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="success">Accept</Button>
                    <Button size="sm" variant="outline">Decline</Button>
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
