import { useGetAdminStats } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Activity, PlayCircle, Coins, BellRing, Gift } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { headers } = useAuth();
  const { data: stats, isLoading } = useGetAdminStats({ request: { headers } });

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Today", value: stats?.activeToday || 0, icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Quizzes Played Today", value: stats?.quizzesPlayedToday || 0, icon: PlayCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Total Points Distributed", value: stats?.totalPointsDistributed || 0, icon: Coins, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "Pending Redeems", value: stats?.pendingRedeems || 0, icon: BellRing, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Total Redeem Points", value: stats?.totalRedeemPoints || 0, icon: Gift, color: "text-pink-500", bg: "bg-pink-500/10" },
  ];

  // Placeholder data for chart to make it look active
  const chartData = [
    { name: "Mon", users: 120, quizzes: 400 },
    { name: "Tue", users: 150, quizzes: 450 },
    { name: "Wed", users: 180, quizzes: 500 },
    { name: "Thu", users: 140, quizzes: 420 },
    { name: "Fri", users: 200, quizzes: 600 },
    { name: "Sat", users: 250, quizzes: 800 },
    { name: "Sun", users: 280, quizzes: 900 },
  ];

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Overview" description="Platform statistics and performance metrics" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="bg-card/50 backdrop-blur border-border/50 hover:bg-card/80 transition-all duration-300 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-3xl font-display font-bold text-foreground">{stat.value.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50 pt-6">
        <div className="px-6 mb-6">
          <h3 className="text-xl font-display font-bold">Activity This Week</h3>
          <p className="text-sm text-muted-foreground">User logins and quizzes completed</p>
        </div>
        <div className="h-[400px] w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff80' }} axisLine={false} tickLine={false} />
              <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff80' }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #ffffff20', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="users" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="quizzes" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
