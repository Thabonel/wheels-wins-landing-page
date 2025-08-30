import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Pill, 
  AlertCircle, 
  Upload, 
  Plus,
  Clock,
  Calendar,
  Shield,
  Heart
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import MedicalDocuments from './MedicalDocuments';
import MedicalMedications from './MedicalMedications';
import MedicalEmergency from './MedicalEmergency';
import { format } from 'date-fns';

export const MedicalDashboard: React.FC = () => {
  const { records, medications, emergencyInfo, isLoading } = useMedical();
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate stats
  const activeMediacations = medications.filter(m => m.active).length;
  const upcomingRefills = medications.filter(m => {
    if (!m.refill_date || !m.active) return false;
    const refillDate = new Date(m.refill_date);
    const daysUntilRefill = Math.ceil((refillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilRefill <= 7 && daysUntilRefill >= 0;
  }).length;

  const recentDocuments = records.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Medical Records</h2>
          <p className="text-muted-foreground">Manage your health documents and information</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground">Total records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Medications</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMediacations}</div>
            <p className="text-xs text-muted-foreground">Current prescriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Refills</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingRefills}</div>
            <p className="text-xs text-muted-foreground">Next 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Info</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emergencyInfo ? '✓' : '!'}</div>
            <p className="text-xs text-muted-foreground">
              {emergencyInfo ? 'Configured' : 'Not set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Recent Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Your latest medical records</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDocuments.length > 0 ? (
                <div className="space-y-2">
                  {recentDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{doc.type.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No documents yet</p>
              )}
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card>
            <CardHeader>
              <CardTitle>Active Medications</CardTitle>
              <CardDescription>Currently prescribed medications</CardDescription>
            </CardHeader>
            <CardContent>
              {medications.filter(m => m.active).length > 0 ? (
                <div className="space-y-2">
                  {medications.filter(m => m.active).slice(0, 5).map(med => (
                    <div key={med.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                      <div className="flex items-center space-x-3">
                        <Pill className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{med.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {med.dosage} - {med.frequency?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      {med.refill_date && (
                        <div className="text-xs text-muted-foreground">
                          Refill: {format(new Date(med.refill_date), 'MMM d')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No active medications</p>
              )}
            </CardContent>
          </Card>

          {/* Emergency Alert */}
          {!emergencyInfo && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Set Up Emergency Information
                </CardTitle>
                <CardDescription>
                  Add your emergency contacts and medical information for quick access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('emergency')}
                  className="w-full sm:w-auto"
                >
                  Configure Emergency Info
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <MedicalDocuments />
        </TabsContent>

        <TabsContent value="medications">
          <MedicalMedications />
        </TabsContent>

        <TabsContent value="emergency">
          <MedicalEmergency />
        </TabsContent>
      </Tabs>
    </div>
  );
};