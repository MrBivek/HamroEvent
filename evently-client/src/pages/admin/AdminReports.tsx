import { useEffect, useState } from "react";
import { BarChart3, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { AdminService } from "@/services/AdminService";

export default function AdminReports() {
    const [bookingsByCategory, setBookingsByCategory] = useState<any[]>([]);
    const [monthlyBookings, setMonthlyBookings] = useState<number[]>([]);

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const res = await AdminService.getApiAdminAnalytics();
                if (!active) return;
                setBookingsByCategory(res?.bookingsByCategory || []);
                setMonthlyBookings(res?.monthlyBookings || []);
            } catch {
                if (!active) return;
                setBookingsByCategory([]);
                setMonthlyBookings([]);
            }
        };
        load();
        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reports</h1>
                    <p className="text-muted-foreground">Platform analytics and insights</p>
                </div>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Bookings by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {bookingsByCategory.map((item) => (
                                <div key={item.category}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-foreground">{item.category}</span>
                                        <span className="text-muted-foreground">
                                            {item.count} ({item.percent}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full gradient-primary rounded-full"
                                            style={{ width: `${item.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Monthly Bookings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-end justify-between gap-2">
                            {monthlyBookings.map((val, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full gradient-primary rounded-t"
                                        style={{ height: `${monthlyBookings.length ? (val / Math.max(...monthlyBookings, 1)) * 100 : 0}%` }}
                                    />
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
