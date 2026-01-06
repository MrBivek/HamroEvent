import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Save, Plus, Trash2, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast.ts';
import { mockVendors } from '@/data/mockData.ts';

export default function VendorProfile() {
  const vendor = mockVendors[0];
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: 'Profile saved', description: 'Your changes have been saved.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Profile</h1>
          <p className="text-muted-foreground">Manage your vendor profile and packages</p>
        </div>
        <Button variant="hero" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input defaultValue={vendor.businessName} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input defaultValue={vendor.category} disabled className="capitalize" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea defaultValue={vendor.description} rows={4} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Input defaultValue={vendor.location} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input defaultValue={vendor.contact.phone} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Packages */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Service Packages</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Package
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {vendor.packages.map((pkg) => (
              <div key={pkg._id} className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-foreground">{pkg.name}</h4>
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                  </div>
                  <Button variant="ghost" size="icon-sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pkg.inclusions.map((item, i) => (
                    <Badge key={i} variant="outline">{item}</Badge>
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground mt-3">
                  NPR {pkg.priceMin.toLocaleString()} - {pkg.priceMax?.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Portfolio</CardTitle>
          <Button variant="outline" size="sm">
            <Image className="h-4 w-4 mr-2" />
            Upload Images
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {vendor.portfolioMedia.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button className="absolute inset-0 bg-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-primary-foreground" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
