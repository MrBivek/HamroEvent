import { Link } from 'react-router-dom';
import { Star, MapPin, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useShortlistStore } from '@/store/shortlistStore.ts';
import type { VendorProfile } from '@/types';
import { Heart } from 'lucide-react';

interface VendorCardProps {
  vendor: VendorProfile;
  index?: number;
}

export function VendorCard({ vendor, index = 0 }: VendorCardProps) {
  const { isShortlisted, addToShortlist, removeFromShortlist } = useShortlistStore();
  const shortlisted = isShortlisted(vendor._id);

  const formatPrice = (min: number, max: number) => {
    if (min === max) return `NPR ${min.toLocaleString()}`;
    return `NPR ${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  const handleShortlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (shortlisted) {
      removeFromShortlist(vendor._id);
    } else {
      addToShortlist(vendor._id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link to={`/vendors/${vendor._id}`}>
        <Card variant="interactive" className="overflow-hidden group h-full hover:shadow-hover transition-shadow duration-300">
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            <motion.img
              src={vendor.portfolioMedia[0] || 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800'}
              alt={vendor.businessName}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.5 }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            
            {/* Shortlist Button */}
            <motion.button
              onClick={handleShortlistClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                shortlisted 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'bg-card/80 backdrop-blur-sm text-foreground hover:bg-card'
              }`}
            >
              <Heart className={`h-4 w-4 transition-transform ${shortlisted ? 'fill-current scale-110' : ''}`} />
            </motion.button>

            {/* Verified Badge */}
            {vendor.verificationStatus === 'verified' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute top-3 left-3"
              >
                <Badge variant="verified" className="gap-1 shadow-md">
                  <BadgeCheck className="h-3 w-3" />
                  Verified
                </Badge>
              </motion.div>
            )}

            {/* Category Badge */}
            <div className="absolute bottom-3 left-3">
              <Badge variant="soft" className="capitalize backdrop-blur-sm">
                {vendor.category.replace('-', ' & ')}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {vendor.businessName}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <motion.div
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Star className="h-4 w-4 fill-warning text-warning" />
                </motion.div>
                <span className="text-sm font-medium">{vendor.ratingAvg.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({vendor.ratingCount})</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
              <MapPin className="h-3.5 w-3.5" />
              <span>{vendor.location}</span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {vendor.description}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-medium text-foreground">
                {formatPrice(vendor.pricingRange.min, vendor.pricingRange.max)}
              </span>
              <Button variant="soft" size="sm" className="group/btn">
                View Details
                <motion.span
                  className="inline-block ml-1"
                  initial={{ x: 0 }}
                  whileHover={{ x: 2 }}
                >
                  →
                </motion.span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
