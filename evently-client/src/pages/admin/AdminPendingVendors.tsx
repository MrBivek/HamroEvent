import { CheckCircle2, XCircle, Eye, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useToast } from '@/hooks/use-toast.ts';

const pendingVendors = [
  { id: '1', name: 'New Photo Studio', category: 'Photography', location: 'Kathmandu', submittedAt: '2025-01-05', docs: 2 },
  { id: '2', name: 'Royal Caterers', category: 'Catering', location: 'Lalitpur', submittedAt: '2025-01-04', docs: 3 },
  { id: '3', name: 'Event Planners Pro', category: 'Decoration', location: 'Bhaktapur', submittedAt: '2025-01-03', docs: 2 },
  { id: '4', name: 'Beat Masters DJ', category: 'DJ & Music', location: 'Pokhara', submittedAt: '2025-01-02', docs: 1 },
];

export default function AdminPendingVendors() {
  const { toast } = useToast();

  const handleApprove = (name: string) => {
    toast({ title: 'Vendor approved', description: `${name} is now verified.` });
  };

  const handleReject = (name: string) => {
    toast({ title: 'Vendor rejected', description: `${name} has been notified.`, variant: 'destructive' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pending Verifications</h1>
        <p className="text-muted-foreground">{pendingVendors.length} vendors awaiting review</p>
      </div>

      <div className="space-y-4">
        {pendingVendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{vendor.name}</h3>
                    <Badge variant="soft">{vendor.category}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{vendor.location}</span>
                    <span>Submitted: {new Date(vendor.submittedAt).toLocaleDateString()}</span>
                    <span>{vendor.docs} documents</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" />Review</Button>
                  <Button variant="success" size="sm" onClick={() => handleApprove(vendor.name)}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleReject(vendor.name)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
