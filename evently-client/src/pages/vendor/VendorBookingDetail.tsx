import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Send, Calendar, MapPin, Clock, User, Package, Check, X, RefreshCw, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { ScrollArea } from '@/components/ui/scroll-area.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import { motion, AnimatePresence } from 'framer-motion';

const mockBooking = {
  id: '1',
  customer: { name: 'Sita Sharma', email: 'sita@example.com', phone: '+977 9812345678', avatar: 'SS' },
  eventType: 'Wedding',
  date: '2025-02-15',
  timeRange: '10:00 AM - 6:00 PM',
  location: 'Kathmandu, Nepal',
  package: { name: 'Premium Package', price: 75000, inclusions: ['8 hours coverage', '2 photographers', 'Drone shots', '500+ edited photos'] },
  notes: 'Please capture candid moments during the ceremony. We prefer natural lighting.',
  status: 'pending',
  history: [
    { status: 'pending', at: '2025-01-20T10:00:00Z', note: 'Booking request submitted' },
  ],
  messages: [
    { id: '1', senderId: 'customer', text: 'Hi! I would like to book your photography services for my wedding.', createdAt: '2025-01-20T10:00:00Z' },
    { id: '2', senderId: 'vendor', text: 'Hello Sita! Thank you for reaching out. I would love to capture your special day. Could you share more details about the venue?', createdAt: '2025-01-20T10:15:00Z' },
    { id: '3', senderId: 'customer', text: 'The venue is Hotel Yak & Yeti in Kathmandu. We expect around 300 guests.', createdAt: '2025-01-20T10:30:00Z' },
  ],
};

export default function VendorBookingDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(mockBooking.messages);
  const [status, setStatus] = useState(mockBooking.status);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const newMsg = {
      id: String(messages.length + 1),
      senderId: 'vendor',
      text: message,
      createdAt: new Date().toISOString(),
    };
    setMessages([...messages, newMsg]);
    setMessage('');
  };

  const handleAccept = () => {
    setStatus('accepted');
    toast({ title: 'Booking Accepted', description: 'The customer has been notified.' });
  };

  const handleReject = () => {
    setStatus('rejected');
    toast({ title: 'Booking Rejected', description: 'The customer has been notified.' });
  };

  const handleReschedule = () => {
    if (!rescheduleDate) return;
    setStatus('reschedule_proposed');
    toast({ title: 'Reschedule Proposed', description: `New date: ${rescheduleDate}` });
  };

  const handleConfirm = () => {
    setStatus('confirmed');
    toast({ title: 'Booking Confirmed', description: 'The booking is now confirmed!' });
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'confirmed': return 'success';
      case 'accepted': return 'soft-secondary';
      case 'pending': return 'warning';
      case 'rejected': case 'cancelled': return 'destructive';
      case 'completed': return 'success';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/vendor/bookings"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Booking Details</h1>
          <p className="text-muted-foreground">Booking #{id}</p>
        </div>
        <Badge variant={getStatusColor(status) as any} className="capitalize text-sm px-3 py-1">
          {status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">{mockBooking.customer.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{mockBooking.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{mockBooking.customer.email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{mockBooking.customer.phone}</p>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{mockBooking.eventType}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(mockBooking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{mockBooking.timeRange}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{mockBooking.location}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{mockBooking.package.name}</span>
              </div>
              <ul className="pl-7 text-sm text-muted-foreground space-y-1">
                {mockBooking.package.inclusions.map((inc, i) => (
                  <li key={i}>• {inc}</li>
                ))}
              </ul>
              <div className="flex items-center gap-3 text-sm pt-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">NPR {mockBooking.package.price.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Customer Notes */}
          {mockBooking.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mockBooking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {status === 'pending' && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button variant="success" className="w-full" onClick={handleAccept}>
                  <Check className="h-4 w-4 mr-2" /> Accept Booking
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" /> Propose Reschedule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Propose New Date</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                      <Textarea placeholder="Reason for reschedule..." value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleReschedule}>Send Proposal</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" className="w-full" onClick={handleReject}>
                  <X className="h-4 w-4 mr-2" /> Decline
                </Button>
              </CardContent>
            </Card>
          )}

          {status === 'accepted' && (
            <Card>
              <CardContent className="p-4">
                <Button variant="success" className="w-full" onClick={handleConfirm}>
                  <Check className="h-4 w-4 mr-2" /> Confirm Booking
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Chat */}
        <Card className="lg:col-span-2 flex flex-col h-[600px]">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-base">Messages</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${msg.senderId === 'vendor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.senderId === 'vendor' 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === 'vendor' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
