import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Check, Building2, Package, Image, FileText,
  User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Globe, Instagram, Facebook,
  Plus, Trash2, Upload, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Label } from '@/components/ui/label.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { vendorCategories, nepalLocations } from '@/data/mockData.ts';

const steps = [
  { id: 1, title: 'Account', icon: User, description: 'Create your account' },
  { id: 2, title: 'Business', icon: Building2, description: 'Business details' },
  { id: 3, title: 'Packages', icon: Package, description: 'Service packages' },
  { id: 4, title: 'Portfolio', icon: Image, description: 'Upload portfolio' },
];

interface PackageForm {
  name: string;
  description: string;
  priceMin: string;
  priceMax: string;
  inclusions: string[];
}

export default function VendorRegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [accountData, setAccountData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [businessData, setBusinessData] = useState({
    businessName: '',
    category: '',
    description: '',
    location: '',
    serviceAreas: [] as string[],
    website: '',
    instagram: '',
    facebook: '',
  });

  const [packages, setPackages] = useState<PackageForm[]>([
    { name: '', description: '', priceMin: '', priceMax: '', inclusions: [''] },
  ]);

  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!agreedToTerms) {
      toast({ title: 'Please agree to the terms', variant: 'destructive' });
      return;
    }
    toast({ 
      title: 'Registration submitted!', 
      description: 'Your vendor account is pending verification.' 
    });
    navigate('/login');
  };

  const addPackage = () => {
    setPackages([...packages, { name: '', description: '', priceMin: '', priceMax: '', inclusions: [''] }]);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, field: keyof PackageForm, value: string | string[]) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const addInclusion = (packageIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].inclusions.push('');
    setPackages(updated);
  };

  const updateInclusion = (packageIndex: number, inclusionIndex: number, value: string) => {
    const updated = [...packages];
    updated[packageIndex].inclusions[inclusionIndex] = value;
    setPackages(updated);
  };

  const removeInclusion = (packageIndex: number, inclusionIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].inclusions = updated[packageIndex].inclusions.filter((_, i) => i !== inclusionIndex);
    setPackages(updated);
  };

  const toggleServiceArea = (area: string) => {
    setBusinessData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.includes(area)
        ? prev.serviceAreas.filter(a => a !== area)
        : [...prev.serviceAreas, area]
    }));
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen gradient-hero py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center animate-glow-pulse">
              <span className="text-2xl font-bold text-primary-foreground">E</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Become a Vendor</h1>
          <p className="text-muted-foreground">Join Nepal's premier event marketplace</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border">
              <motion.div
                className="h-full gradient-primary"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                className="relative flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  className={`h-10 w-10 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                    step.id < currentStep
                      ? 'gradient-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'gradient-primary text-primary-foreground animate-pulse-ring'
                      : 'bg-card border-2 border-border text-muted-foreground'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {step.id < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </motion.div>
                <span className={`mt-2 text-xs font-medium hidden sm:block ${
                  step.id <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card className="shadow-xl overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <AnimatePresence mode="wait" custom={currentStep}>
              <motion.div
                key={currentStep}
                custom={currentStep}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {/* Step 1: Account */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Create Your Account</h2>
                      <p className="text-sm text-muted-foreground">Enter your personal details</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="name"
                            placeholder="Your full name"
                            value={accountData.name}
                            onChange={(e) => setAccountData({ ...accountData, name: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={accountData.email}
                            onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="phone"
                            placeholder="+977-98XXXXXXXX"
                            value={accountData.phone}
                            onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={accountData.password}
                            onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                            className="pl-10 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="••••••••"
                          value={accountData.confirmPassword}
                          onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Business */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Business Details</h2>
                      <p className="text-sm text-muted-foreground">Tell us about your business</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="businessName"
                            placeholder="Your business name"
                            value={businessData.businessName}
                            onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={businessData.category}
                          onValueChange={(value) => setBusinessData({ ...businessData, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {vendorCategories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className="flex items-center gap-2">
                                  <span>{cat.icon}</span>
                                  <span>{cat.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe your services..."
                          value={businessData.description}
                          onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Primary Location</Label>
                        <Select
                          value={businessData.location}
                          onValueChange={(value) => setBusinessData({ ...businessData, location: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {nepalLocations.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Service Areas</Label>
                        <div className="flex flex-wrap gap-2">
                          {nepalLocations.map((area) => (
                            <Badge
                              key={area}
                              variant={businessData.serviceAreas.includes(area) ? 'default' : 'outline'}
                              className="cursor-pointer transition-all hover:scale-105"
                              onClick={() => toggleServiceArea(area)}
                            >
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="website">Website</Label>
                          <div className="relative group">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="website"
                              placeholder="yoursite.com"
                              value={businessData.website}
                              onChange={(e) => setBusinessData({ ...businessData, website: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="instagram">Instagram</Label>
                          <div className="relative group">
                            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="instagram"
                              placeholder="@handle"
                              value={businessData.instagram}
                              onChange={(e) => setBusinessData({ ...businessData, instagram: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="facebook">Facebook</Label>
                          <div className="relative group">
                            <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="facebook"
                              placeholder="page name"
                              value={businessData.facebook}
                              onChange={(e) => setBusinessData({ ...businessData, facebook: e.target.value })}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Packages */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Service Packages</h2>
                      <p className="text-sm text-muted-foreground">Define your service offerings</p>
                    </div>

                    <div className="space-y-6">
                      {packages.map((pkg, pkgIndex) => (
                        <motion.div
                          key={pkgIndex}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="p-4 border border-border rounded-xl space-y-4 relative group hover:border-primary/30 transition-colors"
                        >
                          {packages.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removePackage(pkgIndex)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}

                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-primary" />
                            <span className="font-medium text-foreground">Package {pkgIndex + 1}</span>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Package Name</Label>
                              <Input
                                placeholder="e.g., Premium Package"
                                value={pkg.name}
                                onChange={(e) => updatePackage(pkgIndex, 'name', e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label>Min Price (NPR)</Label>
                                <Input
                                  type="number"
                                  placeholder="25000"
                                  value={pkg.priceMin}
                                  onChange={(e) => updatePackage(pkgIndex, 'priceMin', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Max Price</Label>
                                <Input
                                  type="number"
                                  placeholder="50000"
                                  value={pkg.priceMax}
                                  onChange={(e) => updatePackage(pkgIndex, 'priceMax', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              placeholder="Describe what's included..."
                              value={pkg.description}
                              onChange={(e) => updatePackage(pkgIndex, 'description', e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Inclusions</Label>
                            <div className="space-y-2">
                              {pkg.inclusions.map((inclusion, incIndex) => (
                                <div key={incIndex} className="flex gap-2">
                                  <Input
                                    placeholder="e.g., 4 hours coverage"
                                    value={inclusion}
                                    onChange={(e) => updateInclusion(pkgIndex, incIndex, e.target.value)}
                                  />
                                  {pkg.inclusions.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeInclusion(pkgIndex, incIndex)}
                                      className="shrink-0 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addInclusion(pkgIndex)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Inclusion
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      <Button variant="outline" onClick={addPackage} className="w-full hover-lift">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Another Package
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 4: Portfolio & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Portfolio & Documents</h2>
                      <p className="text-sm text-muted-foreground">Upload your work samples</p>
                    </div>

                    <div className="space-y-4">
                      {/* Portfolio Upload */}
                      <div className="space-y-2">
                        <Label>Portfolio Images</Label>
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer group">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4 group-hover:text-primary transition-colors" />
                            <p className="font-medium text-foreground mb-1">Drag & drop or click to upload</p>
                            <p className="text-sm text-muted-foreground">Upload up to 10 images (JPG, PNG)</p>
                          </motion.div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Note: Portfolio images will be uploaded after registration via your dashboard.
                        </p>
                      </div>

                      {/* Verification Documents */}
                      <div className="space-y-2">
                        <Label>Verification Documents</Label>
                        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                          <p className="font-medium text-foreground mb-1">Upload verification documents</p>
                          <p className="text-sm text-muted-foreground">Business registration, ID proof, etc.</p>
                        </div>
                      </div>

                      {/* Terms */}
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={agreedToTerms}
                            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                            className="mt-1"
                          />
                          <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                            I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                            I understand that my account will be verified before appearing publicly.
                          </label>
                        </div>
                      </div>

                      {/* Success Preview */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-6 gradient-wave rounded-xl text-center"
                      >
                        <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
                        <h3 className="font-semibold text-foreground mb-1">Almost there!</h3>
                        <p className="text-sm text-muted-foreground">
                          Review your information and submit to join Evently's vendor network.
                        </p>
                      </motion.div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <Button
                variant="hero"
                onClick={handleNext}
                className="gap-2"
              >
                {currentStep === 4 ? (
                  <>
                    <Check className="h-4 w-4" />
                    Submit Application
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-6"
        >
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
        </motion.p>
      </div>
    </div>
  );
}
