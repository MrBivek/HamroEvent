import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Send, Phone, Mail, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Badge } from '@/components/ui/badge.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useToast } from '@/hooks/use-toast.ts';

const mockBooking = {
  id: '1',
  vendorName: 'Himalayan Moments Photography',
  vendorImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200',
  vendorPhone: '+977-9812345678',
  vendorEmail: 'himalayan@photography.com',
  category: 'Photography',
  packageName: 'Premium Package',
  eventType: 'Wedding',
  date: '2025-02-15',
  timeRange: { start: '10:00 AM', end: '8:00 PM' },
  location: 'Grand Banquet Hall, Kathmandu',
  notes: 'Please include pre-wedding shoot at Nagarkot viewpoint.',
  status: 'confirmed',
  price: 75000,
  history: [
    { status: 'pending', at: '2025-01-05T10:00:00Z', note: 'Booking request submitted' },
    { status: 'accepted', at: '2025-01-06T14:00:00Z', note: 'Vendor accepted your booking' },
    { status: 'confirmed', at: '2025-01-07T09:00:00Z', note: 'Booking confirmed with advance payment' },
  ],
  messages: [
    { id: '1', sender: 'vendor', text: 'Thank you for your booking request! We are excited to be part of your special day.', createdAt: '2025-01-05T11:00:00Z' },
    { id: '2', sender: 'customer', text: 'Great! Can we include some drone shots as well?', createdAt: '2025-01-05T12:00:00Z' },
    { id: '3', sender: 'vendor', text: 'Absolutely! Drone coverage is included in the Premium Package. We will capture stunning aerial shots.', createdAt: '2025-01-05T14:00:00Z' },
  ],
};

export default function CustomerBookingDetail() {
  const { id } = useParams();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState(mockBooking.messages);
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'accepted': return 'soft-secondary';
      case 'pending': return 'warning';
      case 'completed': return 'default';
      default: return 'outline';
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setMessages([
      ...messages,
      { id: String(messages.length + 1), sender: 'customer', text: newMessage, createdAt: new Date().toISOString() }
    ]);
    setNewMessage('');
    toast({ title: 'Message sent' });
  };

  const handleCancel = () => {
    toast({ title: 'Cancellation requested', description: 'The vendor will be notified.' });
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        to="/customer/bookings"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Booking Info */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <img
                  src={mockBooking.vendorImage}
                  alt={mockBooking.vendorName}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h1 className="text-xl font-bold text-foreground">{mockBooking.vendorName}</h1>
                      <p className="text-muted-foreground">{mockBooking.category} • {mockBooking.packageName}</p>
                    </div>
                    <Badge variant={getStatusVariant(mockBooking.status) as any} className="capitalize">
                      {mockBooking.status}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(mockBooking.date).toLocaleDateString('en-US', {
                          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{mockBooking.timeRange.start} - {mockBooking.timeRange.end}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{mockBooking.location}</span>
                    </div>
                    <div className="font-semibold text-foreground">
                      NPR {mockBooking.price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {mockBooking.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Notes: </span>
                    {mockBooking.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${mockBooking.vendorPhone}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${mockBooking.vendorEmail}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </a>
                </Button>
                {mockBooking.status !== 'completed' && mockBooking.status !== 'cancelled' && (
                  <Button variant="outline" size="sm" onClick={handleCancel} className="text-destructive hover:text-destructive">
                    Cancel Booking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2 ${
                        msg.sender === 'customer'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="lg:w-80">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Booking Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockBooking.history.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      {getStatusIcon(entry.status)}
                      {i < mockBooking.history.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-foreground capitalize">{entry.status}</p>
                      <p className="text-sm text-muted-foreground">{entry.note}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
