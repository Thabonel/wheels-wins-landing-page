import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Phone,
  Building2,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Link as LinkIcon
} from "lucide-react";
import type {
  TransitionService,
  ServiceStats,
  ServiceType,
  ServiceStatus
} from "@/types/transition.types";

export function DigitalLifeManager() {
  const [services, setServices] = useState<TransitionService[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO: Fetch services and stats from API
  useEffect(() => {
    // Mock data for now - will be replaced with actual API call
    const mockServices: TransitionService[] = [
      // Cancellations
      {
        id: "1",
        profile_id: "profile-1",
        user_id: "user-1",
        service_type: "cancellation",
        service_name: "Electric Service",
        category: "Utilities",
        provider: "City Electric",
        account_number: "123456",
        cancellation_target_date: "2025-02-01",
        cancellation_completed: false,
        cancellation_completed_date: null,
        old_account_info: null,
        new_account_info: null,
        consolidation_status: null,
        documents_total: 0,
        documents_scanned: 0,
        storage_location: null,
        status: "pending",
        priority: "high",
        notes: "Schedule final meter reading",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Consolidations
      {
        id: "2",
        profile_id: "profile-1",
        user_id: "user-1",
        service_type: "consolidation",
        service_name: "Bank Accounts",
        category: "Banking",
        provider: null,
        account_number: null,
        cancellation_target_date: null,
        cancellation_completed: false,
        cancellation_completed_date: null,
        old_account_info: "Local Credit Union Checking #9876",
        new_account_info: "Online Bank Checking #5432",
        consolidation_status: "in_progress",
        documents_total: 0,
        documents_scanned: 0,
        storage_location: null,
        status: "in_progress",
        priority: "high",
        notes: "Transfer auto-pay services",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      // Digitizations
      {
        id: "3",
        profile_id: "profile-1",
        user_id: "user-1",
        service_type: "digitization",
        service_name: "Tax Documents",
        category: "Legal/Financial",
        provider: null,
        account_number: null,
        cancellation_target_date: null,
        cancellation_completed: false,
        cancellation_completed_date: null,
        old_account_info: null,
        new_account_info: null,
        consolidation_status: null,
        documents_total: 20,
        documents_scanned: 8,
        storage_location: "Google Drive/Taxes",
        status: "in_progress",
        priority: "high",
        notes: "Last 7 years of returns",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const mockStats: ServiceStats = {
      total_cancellations: 10,
      completed_cancellations: 3,
      pending_cancellations: 7,
      total_consolidations: 6,
      completed_consolidations: 2,
      pending_consolidations: 4,
      total_digitizations: 9,
      documents_scanned: 85,
      documents_total: 200,
      digitization_percentage: 43
    };

    setTimeout(() => {
      setServices(mockServices);
      setStats(mockStats);
      setLoading(false);
    }, 500);
  }, []);

  const handleAddService = (serviceType: ServiceType) => {
    // TODO: Open dialog to add service
    console.log("Add service:", serviceType);
  };

  const handleToggleCancellation = (serviceId: string, completed: boolean) => {
    // TODO: Call API to update cancellation status
    setServices(prevServices =>
      prevServices.map(service =>
        service.id === serviceId
          ? {
              ...service,
              cancellation_completed: completed,
              cancellation_completed_date: completed ? new Date().toISOString() : null,
              status: completed ? "completed" : "pending"
            }
          : service
      )
    );
  };

  const cancellations = services.filter(s => s.service_type === "cancellation");
  const consolidations = services.filter(s => s.service_type === "consolidation");
  const digitizations = services.filter(s => s.service_type === "digitization");

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "in_progress":
        return "text-blue-600";
      case "pending":
        return "text-yellow-600";
      case "cancelled":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case "completed":
        return CheckCircle2;
      case "in_progress":
        return Clock;
      case "pending":
        return AlertCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Digital Life Manager</h2>
        <p className="text-muted-foreground">
          Simplify your transition by consolidating accounts and digitizing documents
        </p>
      </div>

      {/* Overview Stats */}
      {stats && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-600" />
                Service Cancellations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.completed_cancellations}</span>
                  <span className="text-muted-foreground">/ {stats.total_cancellations}</span>
                </div>
                <Progress
                  value={(stats.completed_cancellations / stats.total_cancellations) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                Account Consolidations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.completed_consolidations}</span>
                  <span className="text-muted-foreground">/ {stats.total_consolidations}</span>
                </div>
                <Progress
                  value={(stats.completed_consolidations / stats.total_consolidations) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Document Digitization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{stats.documents_scanned}</span>
                  <span className="text-muted-foreground">/ {stats.documents_total}</span>
                </div>
                <Progress value={stats.digitization_percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for each section */}
      <Tabs defaultValue="cancellations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cancellations">
            Cancellations ({cancellations.length})
          </TabsTrigger>
          <TabsTrigger value="consolidations">
            Consolidations ({consolidations.length})
          </TabsTrigger>
          <TabsTrigger value="digitization">
            Digitization ({digitizations.length})
          </TabsTrigger>
        </TabsList>

        {/* CANCELLATIONS TAB */}
        <TabsContent value="cancellations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Services to cancel before your departure
            </p>
            <Button onClick={() => handleAddService("cancellation")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>

          <div className="space-y-3">
            {cancellations.map((service) => {
              const StatusIcon = getStatusIcon(service.status);
              return (
                <Card key={service.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={service.cancellation_completed}
                        onCheckedChange={(checked) =>
                          handleToggleCancellation(service.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{service.service_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {service.category}
                              {service.provider && ` • ${service.provider}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={getStatusColor(service.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {service.status}
                            </Badge>
                            <Badge variant="secondary">{service.priority}</Badge>
                          </div>
                        </div>

                        {service.cancellation_target_date && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Target:{" "}
                              {new Date(service.cancellation_target_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {service.notes && (
                          <p className="text-sm text-muted-foreground">{service.notes}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CONSOLIDATIONS TAB */}
        <TabsContent value="consolidations" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Combine accounts for simpler management on the road
            </p>
            <Button onClick={() => handleAddService("consolidation")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Consolidation
            </Button>
          </div>

          <div className="space-y-3">
            {consolidations.map((service) => {
              const StatusIcon = getStatusIcon(service.status);
              return (
                <Card key={service.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{service.service_name}</h4>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(service.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {service.consolidation_status || service.status}
                        </Badge>
                        <Badge variant="secondary">{service.priority}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex-1 p-3 bg-muted/50 rounded">
                        <div className="text-xs text-muted-foreground mb-1">Old Account</div>
                        <div>{service.old_account_info || "Not specified"}</div>
                      </div>
                      <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 p-3 bg-muted/50 rounded">
                        <div className="text-xs text-muted-foreground mb-1">New Account</div>
                        <div>{service.new_account_info || "Not specified"}</div>
                      </div>
                    </div>

                    {service.notes && (
                      <p className="text-sm text-muted-foreground">{service.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* DIGITIZATION TAB */}
        <TabsContent value="digitization" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Scan important documents before downsizing
            </p>
            <Button onClick={() => handleAddService("digitization")} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          <div className="space-y-3">
            {digitizations.map((service) => {
              const StatusIcon = getStatusIcon(service.status);
              const percentage =
                service.documents_total > 0
                  ? Math.floor((service.documents_scanned / service.documents_total) * 100)
                  : 0;

              return (
                <Card key={service.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{service.service_name}</h4>
                        <p className="text-sm text-muted-foreground">{service.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(service.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {service.status}
                        </Badge>
                        <Badge variant="secondary">{service.priority}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {service.documents_scanned} / {service.documents_total} scanned
                          ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>

                    {service.storage_location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="h-4 w-4" />
                        <span>{service.storage_location}</span>
                      </div>
                    )}

                    {service.notes && (
                      <p className="text-sm text-muted-foreground">{service.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
