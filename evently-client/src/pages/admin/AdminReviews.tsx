import { Star, Eye, EyeOff, Flag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { useToast } from '@/hooks/use-toast.ts';

const reviews = [
  { id: '1', customer: 'Sita Sharma', vendor: 'Himalayan Photography', rating: 5, comment: 'Amazing service! Highly recommend.', isHidden: false, date: '2025-01-05' },
  { id: '2', customer: 'Ram Thapa', vendor: 'Grand Banquet', rating: 2, comment: 'Poor service, very unprofessional.', isHidden: false, date: '2025-01-04', flagged: true },
  { id: '3', customer: 'Maya Gurung', vendor: 'Spice Catering', rating: 4, comment: 'Good food, slightly delayed.', isHidden: true, date: '2025-01-03' },
];

export default function AdminReviews() {
  const { toast } = useToast();

  const handleHide = (id: string) => toast({ title: 'Review hidden' });
  const handleUnhide = (id: string) => toast({ title: 'Review restored' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Review Moderation</h1>
        <p className="text-muted-foreground">Monitor and moderate customer reviews</p>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id} className={review.isHidden ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-foreground">{review.customer}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">{review.vendor}</span>
                    {review.flagged && <Badge variant="destructive"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>}
                    {review.isHidden && <Badge variant="soft">Hidden</Badge>}
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted'}`} />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{review.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(review.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  {review.isHidden ? (
                    <Button variant="outline" size="sm" onClick={() => handleUnhide(review.id)}>
                      <Eye className="h-4 w-4 mr-1" />Show
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleHide(review.id)}>
                      <EyeOff className="h-4 w-4 mr-1" />Hide
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
