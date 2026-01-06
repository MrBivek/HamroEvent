import { Upload, BadgeCheck, Clock, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { mockVendors } from '@/data/mockData.ts';

export default function VendorVerification() {
  const vendor = mockVendors[0];
  const status = vendor.verificationStatus;

  const getStatusDisplay = () => {
    switch (status) {
      case 'verified':
        return { icon: BadgeCheck, text: 'Verified', variant: 'success' as const, color: 'text-success' };
      case 'pending':
        return { icon: Clock, text: 'Pending Review', variant: 'warning' as const, color: 'text-warning' };
      case 'rejected':
        return { icon: XCircle, text: 'Rejected', variant: 'destructive' as const, color: 'text-destructive' };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Verification</h1>
        <p className="text-muted-foreground">Get verified to increase visibility and trust</p>
      </div>

      {/* Status Card */}
      <Card className={status === 'verified' ? 'bg-success-soft border-success/20' : status === 'pending' ? 'bg-warning-soft border-warning/20' : ''}>
        <CardContent className="p-6 flex items-center gap-4">
          <statusInfo.icon className={`h-12 w-12 ${statusInfo.color}`} />
          <div>
            <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
            <p className="text-muted-foreground mt-1">
              {status === 'verified' && 'Your business is verified and visible to all customers.'}
              {status === 'pending' && 'We are reviewing your documents. This usually takes 1-2 business days.'}
              {status === 'rejected' && 'Please upload valid documents and try again.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verification Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium text-foreground mb-1">Upload Documents</p>
            <p className="text-sm text-muted-foreground mb-4">Business registration, ID proof, or trade license</p>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">Required Documents:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Business Registration Certificate</li>
              <li>Owner ID (Citizenship/Passport)</li>
              <li>PAN/VAT Certificate (if applicable)</li>
            </ul>
          </div>

          <Button variant="hero" className="w-full" disabled={status === 'verified'}>
            Submit for Verification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
