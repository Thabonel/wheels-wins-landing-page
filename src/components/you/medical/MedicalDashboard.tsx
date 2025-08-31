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
  Heart,
  Bot,
  History
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import MedicalDocuments from './MedicalDocuments';
import MedicalMedications from './MedicalMedications';
import MedicalEmergency from './MedicalEmergency';
import HealthConsultation from './HealthConsultation';
import ConsultationHistory from './ConsultationHistory';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { MedicalDisclaimer, MedicalDisclaimerBanner } from './MedicalDisclaimer';
import { format } from 'date-fns';

export const MedicalDashboard: React.FC = () => {
  const { records, medications, emergencyInfo, isLoading } = useMedical();
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [medicationDialogOpen, setMedicationDialogOpen] = useState(false);
  const [showInitialDisclaimer, setShowInitialDisclaimer] = useState(true);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Calculate stats
  const activeMediacations = medications.filter(m => m.active).length;
  const upcomingRefills = medications.filter(m => {
    if (!m.refill_date || !m.active) return false;
    const refillDate = new Date(m.refill_date);
    const daysUntilRefill = Math.ceil((refillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilRefill <= 7 && daysUntilRefill >= 0;
  }).length;

  const recentDocuments = records
    .sort((a, b) => new Date(b.upload_date || b.created_at).getTime() - new Date(a.upload_date || a.created_at).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show initial disclaimer on first access
  if (showInitialDisclaimer && !disclaimerAccepted) {
    return (
      <MedicalDisclaimer 
        type="initial"
        onAccept={() => {
          setDisclaimerAccepted(true);
          setShowInitialDisclaimer(false);
        }}
        onDecline={() => {
          // Redirect away from medical records if declined
          window.history.back();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Persistent disclaimer banner */}
      <MedicalDisclaimerBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Medical Records</h2>
          <p className="text-muted-foreground">Manage your health documents and information</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setUploadDialogOpen(true)}
            size="sm"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button 
            onClick={() => setMedicationDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{records.length}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Medications</p>
                <p className="text-2xl font-bold">{activeMediacations}</p>
              </div>
              <Pill className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Refills</p>
                <p className="text-2xl font-bold">{upcomingRefills}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emergency Info</p>
                <p className="text-2xl font-bold">
                  {emergencyInfo ? 'Configured' : 'Not set'}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="consultation">AI Consult</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
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
                  {recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(doc.upload_date || doc.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{doc.category}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No documents uploaded yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Medication Refills */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Refills</CardTitle>
              <CardDescription>Medications needing refill soon</CardDescription>
            </CardHeader>
            <CardContent>
              {medications.filter(m => m.refill_date && m.active).length > 0 ? (
                <div className="space-y-2">
                  {medications
                    .filter(m => m.refill_date && m.active)
                    .sort((a, b) => new Date(a.refill_date!).getTime() - new Date(b.refill_date!).getTime())
                    .slice(0, 3)
                    .map((med) => {
                      const daysUntilRefill = Math.ceil(
                        (new Date(med.refill_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Pill className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{med.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {med.dosage} - {med.frequency}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={daysUntilRefill <= 3 ? 'destructive' : 'secondary'}
                          >
                            {daysUntilRefill} days
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No upcoming refills
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <MedicalDocuments />
        </TabsContent>

        <TabsContent value="medications">
          <MedicalMedications 
            openAddDialog={medicationDialogOpen}
            onDialogChange={setMedicationDialogOpen}
          />
        </TabsContent>

        <TabsContent value="emergency">
          <MedicalEmergency />
        </TabsContent>

        <TabsContent value="consultation">
          <HealthConsultation />
        </TabsContent>

        <TabsContent value="history">
          <ConsultationHistory />
        </TabsContent>
      </Tabs>

      {/* Document Upload Dialog */}
      <DocumentUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen} 
      />
    </div>
  );
};