import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Users, Calendar, Shield, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { HeroSearch } from '@/components/search/HeroSearch.tsx';
import { VendorCard } from '@/components/vendors/VendorCard.tsx';
import { vendorCategories, mockVendors } from '@/data/mockData.ts';

const stats = [
  { value: '500+', label: 'Verified Vendors' },
  { value: '10k+', label: 'Events Planned' },
  { value: '4.8', label: 'Average Rating' },
  { value: '50+', label: 'Cities Covered' },
];

const features = [
  {
    icon: Shield,
    title: 'Verified Vendors',
    description: 'All vendors are verified through our rigorous screening process.',
  },
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Book and manage all your event services in one place.',
  },
  {
    icon: Users,
    title: 'Real Reviews',
    description: 'Read genuine reviews from customers who have used the services.',
  },
];

const testimonials = [
  {
    name: 'Priya Thapa',
    role: 'Bride',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    text: 'Evently made planning our wedding so much easier! We found amazing vendors all in one place.',
    rating: 5,
  },
  {
    name: 'Rajesh Shrestha',
    role: 'Corporate Event Manager',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    text: 'The platform helped us organize a seamless corporate conference. Highly recommended!',
    rating: 5,
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export default function LandingPage() {
  const featuredVendors = mockVendors.filter(v => v.verificationStatus === 'verified').slice(0, 4);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative gradient-hero pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          {/* Floating shapes */}
          <div className="absolute top-20 left-[10%] w-16 h-16 bg-primary/10 rounded-2xl animate-float" />
          <div
            className="absolute top-40 right-[15%] w-12 h-12 bg-secondary/10 rounded-full animate-float"
            style={{ animationDelay: '1s' }}
          />
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="container relative"
        >
          <div className="max-w-3xl mx-auto text-center mb-10">
            <motion.div variants={itemVariants}>
              <Badge variant="soft" className="mb-4 gap-1 hover-scale cursor-default">
                <Sparkles className="h-3 w-3 animate-pulse-soft" />
                Nepal's #1 Event Marketplace
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            >
              Plan Your Perfect Event with{' '}
              <span className="text-gradient">Trusted Vendors</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Discover and book verified event service providers across Nepal. From venues to photography, catering to decoration – find everything you need.
            </motion.p>
          </div>

          {/* Search Bar */}
          <motion.div variants={itemVariants}>
            <HeroSearch />
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={containerVariants}
            className="flex flex-wrap justify-center gap-8 md:gap-16 mt-12"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="text-center cursor-default"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, type: 'spring', stiffness: 200 }}
                  className="text-2xl md:text-3xl font-bold text-foreground"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Browse by Category
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the perfect vendors for every aspect of your event
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
          >
            {vendorCategories.map((category, index) => (
              <motion.div key={category.value} variants={itemVariants}>
                <Link to={`/vendors?category=${category.value}`}>
                  <Card
                    variant="interactive"
                    className="h-full hover-lift group"
                  >
                    <CardContent className="p-6 text-center">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="text-4xl mb-3"
                      >
                        {category.icon}
                      </motion.div>
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {category.label}
                      </h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Vendors Section */}
      <section className="py-16 md:py-24 gradient-wave">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Top-Rated Vendors
              </h2>
              <p className="text-muted-foreground max-w-xl">
                Handpicked vendors with exceptional ratings and reviews
              </p>
            </div>
            <Button variant="outline" asChild className="hover-lift">
              <Link to="/vendors">
                View All Vendors
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredVendors.map((vendor, index) => (
              <VendorCard key={vendor._id} vendor={vendor} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Evently?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We make event planning simple, reliable, and stress-free
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card variant="gradient" className="h-full hover-lift group">
                  <CardContent className="p-8">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary mb-6 group-hover:shadow-glow transition-shadow"
                    >
                      <feature.icon className="h-6 w-6 text-primary-foreground" />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real stories from people who planned their events with us
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants}>
                <Card className="h-full hover-lift">
                  <CardContent className="p-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      className="flex items-center gap-1 mb-4"
                    >
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          <Star className="h-4 w-4 fill-warning text-warning" />
                        </motion.div>
                      ))}
                    </motion.div>
                    <p className="text-foreground mb-6 italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <motion.img
                        whileHover={{ scale: 1.1 }}
                        src={testimonial.image}
                        alt={testimonial.name}
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                      />
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="gradient-primary border-0 overflow-hidden relative">
              {/* Decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-20 -right-20 w-40 h-40 border border-primary-foreground/10 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                  className="absolute -bottom-20 -left-20 w-60 h-60 border border-primary-foreground/10 rounded-full"
                />
              </div>

              <CardContent className="p-8 md:p-12 text-center relative">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4"
                >
                  Ready to Plan Your Event?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-primary-foreground/80 mb-8 max-w-xl mx-auto"
                >
                  Join thousands of happy customers who planned their perfect events with Evently.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <Button
                    variant="hero-outline"
                    size="lg"
                    asChild
                    className="bg-card/10 border-primary-foreground/30 text-primary-foreground hover:bg-card/20"
                  >
                    <Link to="/vendors">Browse Vendors</Link>
                  </Button>
                  <Button size="lg" asChild className="bg-card text-foreground hover:bg-card/90 group">
                    <Link to="/register/vendor">
                      Become a Vendor
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
