import { FileText, User, Store, Star, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';

const logs = [
  { id: '1', action: 'Vendor Approved', actor: 'Admin', target: 'New Photo Studio', type: 'vendor', at: '2025-01-05T14:30:00Z' },
  { id: '2', action: 'User Deactivated', actor: 'Admin', target: 'spam@example.com', type: 'user', at: '2025-01-05T12:15:00Z' },
  { id: '3', action: 'Review Hidden', actor: 'Admin', target: 'Review #234', type: 'review', at: '2025-01-04T16:45:00Z' },
  { id: '4', action: 'Vendor Rejected', actor: 'Admin', target: 'Fake Services Ltd', type: 'vendor', at: '2025-01-04T10:00:00Z' },
];

export default function AdminAuditLogs() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'vendor': return <Store className="h-4 w-4" />;
      case 'user': return <User className="h-4 w-4" />;
      case 'review': return <Star className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions</p>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                {getIcon(log.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{log.action}</p>
                <p className="text-sm text-muted-foreground">
                  {log.actor} • {log.target}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="capitalize">{log.type}</Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(log.at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
