import { useQuery } from '@tanstack/react-query';
import { getAdminAnalytics } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building2,
  Briefcase,
  FileText,
  Activity,
  UserCheck,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const STATUS_COLORS: Record<string, string> = {
  published: '#22c55e',
  draft: '#9ca3af',
  closed: '#ef4444',
  archived: '#f59e0b',
  active: '#3b82f6',
};

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: getAdminAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Unable to load analytics data.</p>
      </div>
    );
  }

  const overview = analytics.overview;

  const statusData = Object.entries(analytics.statusDistribution || {}).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    fill: STATUS_COLORS[status] || '#9ca3af',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of platform-wide activity and growth</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Users</p>
                <p className="text-xl font-bold">{overview.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Candidates</p>
                <p className="text-xl font-bold">{overview.totalCandidates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Building2 className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Companies</p>
                <p className="text-xl font-bold">{overview.totalCompanies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Briefcase className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Jobs</p>
                <p className="text-xl font-bold">{overview.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
                <p className="text-xl font-bold">{overview.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <FileText className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Applications</p>
                <p className="text-xl font-bold">{overview.totalApplications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Target className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matches</p>
                <p className="text-xl font-bold">{overview.totalMatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">User Growth (Last 90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.userGrowth}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#userGrowthGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Growth */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Application Growth (Last 90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.applicationGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.applicationGrowth}>
                  <defs>
                    <linearGradient id="appGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#appGrowthGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Job Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Skills Across Platform</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topSkills && analytics.topSkills.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.topSkills.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="skill"
                    type="category"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {analytics.topSkills.slice(0, 10).map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No skill data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Companies */}
      {analytics.activeCompanies && analytics.activeCompanies.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most Active Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.activeCompanies.map((company, idx) => {
                const max = analytics.activeCompanies[0].jobCount || 1;
                const pct = Math.round((company.jobCount / max) * 100);
                return (
                  <div key={company.companyName} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {idx + 1}
                        </span>
                        <span className="truncate">{company.companyName}</span>
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {company.jobCount} jobs
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden ml-8">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
