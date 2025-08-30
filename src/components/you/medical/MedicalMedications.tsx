import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Pill, 
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import { format, addDays, isBefore } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MedicalMedication, MedicationFrequency } from '@/types/medical';
import { useEffect } from 'react';

interface MedicalMedicationsProps {
  openAddDialog?: boolean;
  onDialogChange?: (open: boolean) => void;
}

export default function MedicalMedications({ openAddDialog, onDialogChange }: MedicalMedicationsProps) {
  const { medications, addMedication, updateMedication, deleteMedication } = useMedical();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<MedicalMedication | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: '',
    refill_date: '',
    prescribed_by: '',
    notes: '',
    active: true
  });

  // Handle external dialog trigger
  useEffect(() => {
    if (openAddDialog) {
      openDialog();
      // Reset the external trigger
      if (onDialogChange) {
        onDialogChange(false);
      }
    }
  }, [openAddDialog]);

  // Separate active and inactive medications
  const activeMedications = medications.filter(m => m.active);
  const inactiveMedications = medications.filter(m => !m.active);

  // Check for upcoming refills
  const getRefillStatus = (refillDate: string | null) => {
    if (!refillDate) return null;
    
    const date = new Date(refillDate);
    const today = new Date();
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'overdue', text: 'Overdue', color: 'bg-red-100 text-red-800' };
    if (daysUntil <= 7) return { status: 'soon', text: `${daysUntil} days`, color: 'bg-yellow-100 text-yellow-800' };
    if (daysUntil <= 30) return { status: 'upcoming', text: `${daysUntil} days`, color: 'bg-blue-100 text-blue-800' };
    return null;
  };

  const openDialog = (medication?: MedicalMedication) => {
    if (medication) {
      setEditingMedication(medication);
      setFormData({
        name: medication.name,
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        refill_date: medication.refill_date || '',
        prescribed_by: medication.prescribed_by || '',
        notes: medication.notes || '',
        active: medication.active
      });
    } else {
      setEditingMedication(null);
      setFormData({
        name: '',
        dosage: '',
        frequency: '',
        refill_date: '',
        prescribed_by: '',
        notes: '',
        active: true
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const data = {
      name: formData.name,
      dosage: formData.dosage || null,
      frequency: formData.frequency || null,
      refill_date: formData.refill_date || null,
      prescribed_by: formData.prescribed_by || null,
      notes: formData.notes || null,
      active: formData.active
    };

    if (editingMedication) {
      await updateMedication(editingMedication.id, data);
    } else {
      await addMedication(data as any);
    }

    setDialogOpen(false);
  };

  const getFrequencyLabel = (frequency: string | null) => {
    if (!frequency) return '';
    return frequency.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Medications</CardTitle>
              <CardDescription>Track your prescriptions and refill schedules</CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Medication
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Refill Alerts */}
      {medications.some(m => m.refill_date && getRefillStatus(m.refill_date)) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Refill Reminders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {medications
                .filter(m => m.refill_date && getRefillStatus(m.refill_date))
                .map(med => {
                  const status = getRefillStatus(med.refill_date!);
                  return (
                    <div key={med.id} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{med.name}</span>
                      <Badge className={status?.color}>
                        Refill {status?.text}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Medications */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Active Medications</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {activeMedications.length > 0 ? (
            activeMedications.map(medication => (
              <Card key={medication.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{medication.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openDialog(medication)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteMedication(medication.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {medication.dosage && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Dosage:</span>
                        <span>{medication.dosage}</span>
                      </div>
                    )}
                    {medication.frequency && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{getFrequencyLabel(medication.frequency)}</span>
                      </div>
                    )}
                    {medication.refill_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>Refill: {format(new Date(medication.refill_date), 'MMM d, yyyy')}</span>
                        {getRefillStatus(medication.refill_date) && (
                          <Badge className={getRefillStatus(medication.refill_date)?.color} variant="secondary">
                            {getRefillStatus(medication.refill_date)?.text}
                          </Badge>
                        )}
                      </div>
                    )}
                    {medication.prescribed_by && (
                      <div className="text-muted-foreground">
                        Prescribed by: {medication.prescribed_by}
                      </div>
                    )}
                    {medication.notes && (
                      <div className="text-muted-foreground italic">
                        {medication.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-2">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Pill className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active medications</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Inactive Medications */}
      {inactiveMedications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Inactive Medications</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {inactiveMedications.map(medication => (
              <Card key={medication.id} className="opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Pill className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{medication.name}</CardTitle>
                    </div>
                    <Badge variant="secondary">Inactive</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {medication.dosage && <div>Dosage: {medication.dosage}</div>}
                    {medication.prescribed_by && <div>Prescribed by: {medication.prescribed_by}</div>}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => updateMedication(medication.id, { active: true })}
                  >
                    Reactivate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Medication Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMedication ? 'Edit Medication' : 'Add New Medication'}
            </DialogTitle>
            <DialogDescription>
              {editingMedication ? 'Update medication details' : 'Add a new medication to track'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Medication Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Aspirin"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dosage">Dosage</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 500mg"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once_daily">Once Daily</SelectItem>
                  <SelectItem value="twice_daily">Twice Daily</SelectItem>
                  <SelectItem value="three_times_daily">Three Times Daily</SelectItem>
                  <SelectItem value="four_times_daily">Four Times Daily</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="refill_date">Refill Date</Label>
              <Input
                id="refill_date"
                type="date"
                value={formData.refill_date}
                onChange={(e) => setFormData({ ...formData, refill_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prescribed_by">Prescribed By</Label>
              <Input
                id="prescribed_by"
                value={formData.prescribed_by}
                onChange={(e) => setFormData({ ...formData, prescribed_by: e.target.value })}
                placeholder="Doctor's name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Active medication</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingMedication ? 'Update' : 'Add'} Medication
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}