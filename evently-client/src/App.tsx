import { Toaster } from "@/components/ui/toaster.tsx";
import { Toaster as Sonner } from "@/components/ui/sonner.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout.tsx";
import { DashboardLayout } from "@/components/layout/DashboardLayout.tsx";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute.tsx";
import LandingPage from "@/pages/LandingPage.tsx";
import VendorsPage from "@/pages/VendorsPage.tsx";
import VendorDetailPage from "@/pages/VendorDetailPage.tsx";
import LoginPage from "@/pages/auth/LoginPage.tsx";
import CustomerRegisterPage from "@/pages/auth/CustomerRegisterPage.tsx";
import VendorRegisterPage from "@/pages/auth/VendorRegisterPage.tsx";
import { AboutPage, ContactPage } from "@/pages/StaticPages.tsx";
import CustomerDashboard from "@/pages/customer/CustomerDashboard.tsx";
import CustomerEvents from "@/pages/customer/CustomerEvents.tsx";
import CustomerEventDetail from "@/pages/customer/CustomerEventDetail.tsx";
import CustomerBookings from "@/pages/customer/CustomerBookings.tsx";
import CustomerBookingDetail from "@/pages/customer/CustomerBookingDetail.tsx";
import CustomerShortlist from "@/pages/customer/CustomerShortlist.tsx";
import CustomerProfile from "@/pages/customer/CustomerProfile.tsx";
import CustomerNotifications from "@/pages/customer/CustomerNotifications.tsx";
import VendorDashboard from "@/pages/vendor/VendorDashboard.tsx";
import VendorProfilePage from "@/pages/vendor/VendorProfilePage.tsx";
import VendorAvailability from "@/pages/vendor/VendorAvailability.tsx";
import VendorBookings from "@/pages/vendor/VendorBookings.tsx";
import VendorBookingDetail from "@/pages/vendor/VendorBookingDetail.tsx";
import VendorPayments from "@/pages/vendor/VendorPayments.tsx";
import VendorVerification from "@/pages/vendor/VendorVerification.tsx";
import VendorNotifications from "@/pages/vendor/VendorNotifications.tsx";
import AdminDashboard from "@/pages/admin/AdminDashboard.tsx";
import AdminPendingVendors from "@/pages/admin/AdminPendingVendors.tsx";
import AdminUsers from "@/pages/admin/AdminUsers.tsx";
import AdminReviews from "@/pages/admin/AdminReviews.tsx";
import AdminReports from "@/pages/admin/AdminReports.tsx";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs.tsx";
import NotFound from "@/pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/vendors/:id" element={<VendorDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>
          
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/customer" element={<CustomerRegisterPage />} />
          <Route path="/register/vendor" element={<VendorRegisterPage />} />
          
          {/* Customer routes */}
          <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/customer/dashboard" element={<CustomerDashboard />} />
              <Route path="/customer/events" element={<CustomerEvents />} />
              <Route path="/customer/events/:id" element={<CustomerEventDetail />} />
              <Route path="/customer/bookings" element={<CustomerBookings />} />
              <Route path="/customer/bookings/:id" element={<CustomerBookingDetail />} />
              <Route path="/customer/shortlist" element={<CustomerShortlist />} />
              <Route path="/customer/profile" element={<CustomerProfile />} />
              <Route path="/customer/notifications" element={<CustomerNotifications />} />
            </Route>
          </Route>
          
          {/* Vendor routes */}
          <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              <Route path="/vendor/profile" element={<VendorProfilePage />} />
              <Route path="/vendor/availability" element={<VendorAvailability />} />
              <Route path="/vendor/bookings" element={<VendorBookings />} />
              <Route path="/vendor/bookings/:id" element={<VendorBookingDetail />} />
              <Route path="/vendor/payments" element={<VendorPayments />} />
              <Route path="/vendor/verification" element={<VendorVerification />} />
              <Route path="/vendor/notifications" element={<VendorNotifications />} />
            </Route>
          </Route>
          
          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/vendors/pending" element={<AdminPendingVendors />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            </Route>
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
