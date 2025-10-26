import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DollarSign,
  Briefcase,
  Laptop,
  TrendingUp,
  Calendar,
  Plus,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Pause
} from "lucide-react";
import type {
  IncomeStream,
  IncomeStats,
  IncomeType,
  IncomeStatus,
  ChecklistItem
} from "@/types/transition.types";

export function IncomeStreams() {
  const [streams, setStreams] = useState<IncomeStream[]>([]);
  const [stats, setStats] = useState<IncomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO: Fetch streams and stats from API
  useEffect(() => {
    // Mock data for now - will be replaced with actual API call
    const mockStreams: IncomeStream[] = [
      // Remote work example
      {
        id: "1",
        profile_id: "profile-1",
        user_id: "user-1",
        stream_name: "Remote Software Development",
        income_type: "remote_work",
        monthly_estimate: 6000,
        actual_monthly: 6200,
        status: "active",
        setup_checklist: [
          { task: "Update resume with remote experience", completed: true },
          { task: "Set up home office workspace", completed: true },
          { task: "Research companies hiring remote", completed: true },
          { task: "Join remote job boards", completed: true },
          { task: "Prepare for remote interviews", completed: true }
        ],
        setup_completed: true,
        setup_completed_date: "2024-11-15",
        resources: [
          { title: "We Work Remotely", url: "https://weworkremotely.com" },
          { title: "Remote.co", url: "https://remote.co" }
        ],
        notes: "Full-time position with Tech Corp, fully remote friendly",
        priority: "high",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: "2024-11-20",
        discontinued_at: null
      },
      // Freelance example
      {
        id: "2",
        profile_id: "profile-1",
        user_id: "user-1",
        stream_name: "Freelance Consulting",
        income_type: "freelance",
        monthly_estimate: 2000,
        actual_monthly: 0,
        status: "setting_up",
        setup_checklist: [
          { task: "Create portfolio website", completed: true },
          { task: "Set up payment processing (PayPal/Stripe)", completed: true },
          { task: "Register freelance profile on platforms", completed: false },
          { task: "Define service packages and pricing", completed: false },
          { task: "Create client contracts template", completed: false }
        ],
        setup_completed: false,
        setup_completed_date: null,
        resources: [
          { title: "Upwork", url: "https://www.upwork.com" },
          { title: "Fiverr", url: "https://www.fiverr.com" }
        ],
        notes: "Tech consulting on weekends",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        discontinued_at: null
      },
      // Passive income example
      {
        id: "3",
        profile_id: "profile-1",
        user_id: "user-1",
        stream_name: "Investment Dividends",
        income_type: "passive",
        monthly_estimate: 500,
        actual_monthly: 480,
        status: "active",
        setup_checklist: [
          { task: "Review current investment portfolio", completed: true },
          { task: "Consider dividend stocks or REITs", completed: true },
          { task: "Set up automatic reinvestment", completed: true },
          { task: "Ensure mobile access to accounts", completed: true },
          { task: "Plan for tax implications while traveling", completed: true }
        ],
        setup_completed: true,
        setup_completed_date: "2024-10-01",
        resources: [
          { title: "Vanguard", url: "https://investor.vanguard.com" },
          { title: "M1 Finance", url: "https://www.m1finance.com" }
        ],
        notes: "REIT and dividend stock portfolio",
        priority: "low",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: "2024-10-01",
        discontinued_at: null
      },
      // Seasonal example
      {
        id: "4",
        profile_id: "profile-1",
        user_id: "user-1",
        stream_name: "Summer Park Ranger",
        income_type: "seasonal",
        monthly_estimate: 3000,
        actual_monthly: 0,
        status: "planning",
        setup_checklist: [
          { task: "Research seasonal job opportunities", completed: false },
          { task: "Create list of preferred locations", completed: false },
          { task: "Apply 3-6 months in advance", completed: false },
          { task: "Arrange RV parking with employer", completed: false },
          { task: "Plan budget for off-season", completed: false }
        ],
        setup_completed: false,
        setup_completed_date: null,
        resources: [
          { title: "Coolworks", url: "https://www.coolworks.com" },
          { title: "Workamper News", url: "https://www.workamper.com" }
        ],
        notes: "Apply for summer 2025 positions in March",
        priority: "medium",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        started_at: null,
        discontinued_at: null
      }
    ];

    const mockStats: IncomeStats = {
      total_streams: 4,
      active_streams: 2,
      total_monthly_estimate: 11500,
      total_actual_monthly: 6680,
      remote_work_count: 1,
      freelance_count: 1,
      passive_count: 1,
      seasonal_count: 1,
      setup_completion_percentage: 50
    };

    setTimeout(() => {
      setStreams(mockStreams);
      setStats(mockStats);
      setLoading(false);
    }, 500);
  }, []);

  const handleAddStream = () => {
    // TODO: Open dialog to add income stream
    console.log("Add income stream");
  };

  const handleToggleChecklist = (streamId: string, taskIndex: number, completed: boolean) => {
    // TODO: Call API to update checklist item
    setStreams(prevStreams =>
      prevStreams.map(stream =>
        stream.id === streamId
          ? {
              ...stream,
              setup_checklist: stream.setup_checklist.map((item, idx) =>
                idx === taskIndex ? { ...item, completed } : item
              )
            }
          : stream
      )
    );
  };

  const getIncomeTypeIcon = (type: IncomeType) => {
    switch (type) {
      case "remote_work":
        return Laptop;
      case "freelance":
        return Briefcase;
      case "passive":
        return TrendingUp;
      case "seasonal":
        return Calendar;
      default:
        return DollarSign;
    }
  };

  const getStatusColor = (status: IncomeStatus) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "setting_up":
        return "text-blue-600";
      case "planning":
        return "text-yellow-600";
      case "paused":
        return "text-gray-600";
      case "discontinued":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: IncomeStatus) => {
    switch (status) {
      case "active":
        return CheckCircle2;
      case "setting_up":
        return Clock;
      case "planning":
        return AlertCircle;
      case "paused":
        return Pause;
      case "discontinued":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getIncomeTypeLabel = (type: IncomeType) => {
    switch (type) {
      case "remote_work":
        return "Remote Work";
      case "freelance":
        return "Freelance";
      case "passive":
        return "Passive Income";
      case "seasonal":
        return "Seasonal Work";
      default:
        return type;
    }
  };

  const getChecklistProgress = (checklist: ChecklistItem[]) => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(item => item.completed).length;
    return Math.floor((completed / checklist.length) * 100);
  };

  // Group streams by type
  const remoteWorkStreams = streams.filter(s => s.income_type === "remote_work");
  const freelanceStreams = streams.filter(s => s.income_type === "freelance");
  const passiveStreams = streams.filter(s => s.income_type === "passive");
  const seasonalStreams = streams.filter(s => s.income_type === "seasonal");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Income Streams</h2>
          <p className="text-muted-foreground">
            Plan and track your income sources for the nomadic lifestyle
          </p>
        </div>
        <Button onClick={handleAddStream}>
          <Plus className="h-4 w-4 mr-2" />
          Add Stream
        </Button>
      </div>

      {/* Summary Cards */}
      {stats && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${stats.total_monthly_estimate.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Estimated income</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${stats.total_actual_monthly.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active_streams} active streams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Income Diversity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 bg-muted rounded overflow-hidden flex">
                    {stats.remote_work_count > 0 && (
                      <div
                        className="bg-blue-500"
                        style={{
                          width: `${(stats.remote_work_count / stats.total_streams) * 100}%`
                        }}
                      />
                    )}
                    {stats.freelance_count > 0 && (
                      <div
                        className="bg-purple-500"
                        style={{
                          width: `${(stats.freelance_count / stats.total_streams) * 100}%`
                        }}
                      />
                    )}
                    {stats.passive_count > 0 && (
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${(stats.passive_count / stats.total_streams) * 100}%`
                        }}
                      />
                    )}
                    {stats.seasonal_count > 0 && (
                      <div
                        className="bg-orange-500"
                        style={{
                          width: `${(stats.seasonal_count / stats.total_streams) * 100}%`
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded bg-blue-500" />
                    <span>Remote ({stats.remote_work_count})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded bg-purple-500" />
                    <span>Freelance ({stats.freelance_count})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded bg-green-500" />
                    <span>Passive ({stats.passive_count})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded bg-orange-500" />
                    <span>Seasonal ({stats.seasonal_count})</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Setup Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.setup_completion_percentage}%</span>
                  <span className="text-muted-foreground text-sm">complete</span>
                </div>
                <Progress value={stats.setup_completion_percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income Streams by Type */}
      <div className="space-y-6">
        {/* Remote Work */}
        {remoteWorkStreams.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Laptop className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Remote Work</h3>
              <Badge variant="secondary">{remoteWorkStreams.length}</Badge>
            </div>
            <div className="space-y-3">
              {remoteWorkStreams.map(stream => {
                const Icon = getIncomeTypeIcon(stream.income_type);
                const StatusIcon = getStatusIcon(stream.status);
                const checklistProgress = getChecklistProgress(stream.setup_checklist);

                return (
                  <Card key={stream.id}>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{stream.stream_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(stream.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {stream.status}
                              </Badge>
                              <Badge variant="secondary">{stream.priority}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${stream.monthly_estimate.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                            {stream.actual_monthly > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                Actual: ${stream.actual_monthly.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Setup Checklist */}
                        {stream.setup_checklist.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className="font-medium">{checklistProgress}%</span>
                            </div>
                            <Progress value={checklistProgress} className="h-2" />
                            <div className="space-y-1">
                              {stream.setup_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) =>
                                      handleToggleChecklist(stream.id, idx, checked as boolean)
                                    }
                                  />
                                  <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                    {item.task}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resources */}
                        {stream.resources.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Resources</div>
                            <div className="flex flex-wrap gap-2">
                              {stream.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                  {resource.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {stream.notes && (
                          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                            {stream.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Freelance */}
        {freelanceStreams.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Freelance</h3>
              <Badge variant="secondary">{freelanceStreams.length}</Badge>
            </div>
            <div className="space-y-3">
              {freelanceStreams.map(stream => {
                const StatusIcon = getStatusIcon(stream.status);
                const checklistProgress = getChecklistProgress(stream.setup_checklist);

                return (
                  <Card key={stream.id}>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{stream.stream_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(stream.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {stream.status}
                              </Badge>
                              <Badge variant="secondary">{stream.priority}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${stream.monthly_estimate.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                        </div>

                        {stream.setup_checklist.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className="font-medium">{checklistProgress}%</span>
                            </div>
                            <Progress value={checklistProgress} className="h-2" />
                            <div className="space-y-1">
                              {stream.setup_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) =>
                                      handleToggleChecklist(stream.id, idx, checked as boolean)
                                    }
                                  />
                                  <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                    {item.task}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.resources.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Resources</div>
                            <div className="flex flex-wrap gap-2">
                              {stream.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                  {resource.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.notes && (
                          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                            {stream.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Passive Income */}
        {passiveStreams.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Passive Income</h3>
              <Badge variant="secondary">{passiveStreams.length}</Badge>
            </div>
            <div className="space-y-3">
              {passiveStreams.map(stream => {
                const StatusIcon = getStatusIcon(stream.status);
                const checklistProgress = getChecklistProgress(stream.setup_checklist);

                return (
                  <Card key={stream.id}>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{stream.stream_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(stream.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {stream.status}
                              </Badge>
                              <Badge variant="secondary">{stream.priority}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${stream.monthly_estimate.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                            {stream.actual_monthly > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                Actual: ${stream.actual_monthly.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>

                        {stream.setup_checklist.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className="font-medium">{checklistProgress}%</span>
                            </div>
                            <Progress value={checklistProgress} className="h-2" />
                            <div className="space-y-1">
                              {stream.setup_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) =>
                                      handleToggleChecklist(stream.id, idx, checked as boolean)
                                    }
                                  />
                                  <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                    {item.task}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.resources.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Resources</div>
                            <div className="flex flex-wrap gap-2">
                              {stream.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                  {resource.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.notes && (
                          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                            {stream.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Seasonal Work */}
        {seasonalStreams.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Seasonal Work</h3>
              <Badge variant="secondary">{seasonalStreams.length}</Badge>
            </div>
            <div className="space-y-3">
              {seasonalStreams.map(stream => {
                const StatusIcon = getStatusIcon(stream.status);
                const checklistProgress = getChecklistProgress(stream.setup_checklist);

                return (
                  <Card key={stream.id}>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{stream.stream_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(stream.status)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {stream.status}
                              </Badge>
                              <Badge variant="secondary">{stream.priority}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${stream.monthly_estimate.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                        </div>

                        {stream.setup_checklist.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Setup Progress</span>
                              <span className="font-medium">{checklistProgress}%</span>
                            </div>
                            <Progress value={checklistProgress} className="h-2" />
                            <div className="space-y-1">
                              {stream.setup_checklist.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={(checked) =>
                                      handleToggleChecklist(stream.id, idx, checked as boolean)
                                    }
                                  />
                                  <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                    {item.task}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.resources.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">Resources</div>
                            <div className="flex flex-wrap gap-2">
                              {stream.resources.map((resource, idx) => (
                                <a
                                  key={idx}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                >
                                  {resource.title}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {stream.notes && (
                          <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                            {stream.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
