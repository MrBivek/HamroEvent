import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import { vendorCategories, nepalLocations } from '@/data/mockData.ts';

interface HeroSearchProps {
  variant?: 'hero' | 'compact';
}

export function HeroSearch({ variant = 'hero' }: HeroSearchProps) {
  const navigate = useNavigate();
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (keyword) params.set('q', keyword);
    navigate(`/vendors?${params.toString()}`);
  };

  if (variant === 'compact') {
    return (
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search vendors..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" variant="hero">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSearch} className="w-full max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-2 shadow-xl border border-border/50">
        <div className="flex flex-col md:flex-row gap-2">
          {/* Service Type */}
          <div className="flex-1">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-12 border-0 bg-transparent text-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <SelectValue placeholder="Service Type" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
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

          {/* Divider */}
          <div className="hidden md:block w-px bg-border" />

          {/* Location */}
          <div className="flex-1">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="h-12 border-0 bg-transparent text-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <SelectValue placeholder="Location" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {nepalLocations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border" />

          {/* Keyword Search */}
          <div className="flex-1">
            <div className="relative h-12">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search keywords..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-12 pl-10 border-0 bg-transparent"
              />
            </div>
          </div>

          {/* Search Button */}
          <Button type="submit" variant="hero" size="lg" className="h-12 px-8">
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}
