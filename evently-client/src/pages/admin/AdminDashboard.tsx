import { Link } from 'react-router-dom';
import { Users, Store, Calendar, Star, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '2,456', icon: Users, change: '+12%', color: 'bg-primary-soft text-primary' },
    { label: 'Active Vendors', value: '342', icon: Store, change: '+8%', color: 'bg-secondary-soft text-secondary' },
    { label: 'Total Bookings', value: '1,893', icon: Calendar, change: '+23%', color: 'bg-success-soft text-success' },
    { label: 'Avg Rating', value: '4.7', icon: Star, change: '+0.2', color: 'bg-warning-soft text-warning' },
  ];

  const pendingVendors = [
    { id: '1', name: 'New Photo Studio', category: 'Photography', date: '2025-01-05' },
    { id: '2', name: 'Royal Caterers', category: 'Catering', date: '2025-01-04' },
    { id: '3', name: 'Event Planners Pro', category: 'Decoration', date: '2025-01-03' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <Badge variant="soft-success" className="text-xs">{stat.change}</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Verifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Pending Verifications
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/vendors/pending">View All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-foreground">{vendor.name}</p>
                  <p className="text-sm text-muted-foreground">{vendor.category}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="success"><CheckCircle2 className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline">Review</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link to="/admin/vendors/pending">
                <Store className="h-6 w-6 mb-2" />
                <span>Verify Vendors</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link to="/admin/users">
                <Users className="h-6 w-6 mb-2" />
                <span>Manage Users</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link to="/admin/reviews">
                <Star className="h-6 w-6 mb-2" />
                <span>Moderate Reviews</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col" asChild>
              <Link to="/admin/reports">
                <TrendingUp className="h-6 w-6 mb-2" />
                <span>View Reports</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
