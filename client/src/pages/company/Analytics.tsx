import { useQuery } from '@tanstack/react-query';
import { getCompanyAnalytics } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  Trophy,
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
  Treemap,
} from 'recharts';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 220 70% 50%))',
  'hsl(var(--chart-3, 150 60% 45%))',
  'hsl(var(--chart-4, 45 90% 55%))',
  'hsl(var(--chart-5, 0 70% 55%))',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function CompanyAnalytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['company-analytics'],
    queryFn: getCompanyAnalytics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
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

  // Build pipeline data array from record
  const pipelineData = Object.entries(analytics.pipelineConversion || {}).map(([stage, count]) => ({
    name: stage,
    value: count,
  }));

  // Build locations data for pie chart
  const locationData = Object.entries(analytics.candidateLocations || {}).map(([location, count]) => ({
    name: location || 'Unknown',
    value: count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your hiring performance and application trends</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Briefcase className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{overview.activeJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Applicants</p>
                <p className="text-2xl font-bold">{overview.totalApplications}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{overview.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg Time to Hire</p>
                <p className="text-2xl font-bold">{overview.avgTimeToHire}<span className="text-sm font-normal ml-0.5">d</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Trophy className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hired</p>
                <p className="text-2xl font-bold">{overview.hired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Applications Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.applicationsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.applicationsOverTime}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#areaGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No data available yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pipelineData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
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
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No pipeline data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Jobs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Jobs by Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topJobs.length > 0 ? (
              <div className="space-y-3">
                {analytics.topJobs.map((job, idx) => {
                  const max = analytics.topJobs[0].applicationCount || 1;
                  const pct = Math.round((job.applicationCount / max) * 100);
                  return (
                    <div key={job.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2">{idx + 1}. {job.title}</span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {job.applicationCount} apps · {job.avgMatchScore.toFixed(0)}% avg
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
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
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No job data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidate Locations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Candidate Locations</CardTitle>
          </CardHeader>
          <CardContent>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={locationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {locationData.map((_entry, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                No location data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skills in Demand */}
      {analytics.skillsDemand && analytics.skillsDemand.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most In-Demand Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.skillsDemand.map((skill) => (
                <span
                  key={skill.skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary"
                >
                  {skill.skill}
                  <span className="text-xs opacity-70">({skill.count})</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
