import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle,
  Phone,
  User,
  Heart,
  Shield,
  Plus,
  Edit,
  Save,
  Printer,
  X
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import { Textarea } from '@/components/ui/textarea';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

interface DoctorInfo {
  name?: string;
  phone?: string;
  practice?: string;
}

interface InsuranceInfo {
  provider?: string;
  policyNumber?: string;
  groupNumber?: string;
  phone?: string;
}

export default function MedicalEmergency() {
  const { emergencyInfo, updateEmergencyInfo } = useMedical();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    blood_type: '',
    allergies: [] as string[],
    medical_conditions: [] as string[],
    emergency_contacts: [] as EmergencyContact[],
    primary_doctor: {} as DoctorInfo,
    insurance_info: {} as InsuranceInfo
  });

  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');

  useEffect(() => {
    if (emergencyInfo) {
      setFormData({
        blood_type: emergencyInfo.blood_type || '',
        allergies: emergencyInfo.allergies || [],
        medical_conditions: emergencyInfo.medical_conditions || [],
        emergency_contacts: emergencyInfo.emergency_contacts || [],
        primary_doctor: emergencyInfo.primary_doctor || {},
        insurance_info: emergencyInfo.insurance_info || {}
      });
    }
  }, [emergencyInfo]);

  const handleSave = async () => {
    await updateEmergencyInfo(formData);
    setIsEditing(false);
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies.filter((_, i) => i !== index)
    });
  };

  const addCondition = () => {
    if (newCondition.trim()) {
      setFormData({
        ...formData,
        medical_conditions: [...formData.medical_conditions, newCondition.trim()]
      });
      setNewCondition('');
    }
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      medical_conditions: formData.medical_conditions.filter((_, i) => i !== index)
    });
  };

  const addEmergencyContact = () => {
    setFormData({
      ...formData,
      emergency_contacts: [
        ...formData.emergency_contacts,
        { name: '', phone: '', relationship: '', isPrimary: formData.emergency_contacts.length === 0 }
      ]
    });
  };

  const updateEmergencyContact = (index: number, field: keyof EmergencyContact, value: any) => {
    const contacts = [...formData.emergency_contacts];
    contacts[index] = { ...contacts[index], [field]: value };
    
    // If setting as primary, unset others
    if (field === 'isPrimary' && value === true) {
      contacts.forEach((c, i) => {
        if (i !== index) c.isPrimary = false;
      });
    }
    
    setFormData({ ...formData, emergency_contacts: contacts });
  };

  const removeEmergencyContact = (index: number) => {
    setFormData({
      ...formData,
      emergency_contacts: formData.emergency_contacts.filter((_, i) => i !== index)
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isEditing && !emergencyInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Emergency Information
          </CardTitle>
          <CardDescription>
            Set up your emergency medical information for quick access in case of emergencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsEditing(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Set Up Emergency Information
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Emergency Information</CardTitle>
              <CardDescription>Critical medical information for emergencies</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <Button variant="outline" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Card
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {formData.emergency_contacts.map((contact, index) => (
                <div key={index} className="grid gap-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={contact.name}
                        onChange={(e) => updateEmergencyContact(index, 'name', e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={contact.phone}
                        onChange={(e) => updateEmergencyContact(index, 'phone', e.target.value)}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Relationship</Label>
                      <Input
                        value={contact.relationship}
                        onChange={(e) => updateEmergencyContact(index, 'relationship', e.target.value)}
                        placeholder="e.g., Spouse, Parent"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={contact.isPrimary}
                          onChange={(e) => updateEmergencyContact(index, 'isPrimary', e.target.checked)}
                        />
                        Primary contact
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmergencyContact(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addEmergencyContact}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {formData.emergency_contacts.length > 0 ? (
                formData.emergency_contacts.map((contact, index) => (
                  <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-accent">
                    <div>
                      <p className="font-medium">
                        {contact.name}
                        {contact.isPrimary && (
                          <Badge className="ml-2" variant="secondary">Primary</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.relationship} • {contact.phone}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No emergency contacts set</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medical Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label>Blood Type</Label>
                  <Input
                    value={formData.blood_type}
                    onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
                    placeholder="e.g., O+, A-, B+"
                  />
                </div>
                <div>
                  <Label>Allergies</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newAllergy}
                      onChange={(e) => setNewAllergy(e.target.value)}
                      placeholder="Add allergy"
                      onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                    />
                    <Button size="sm" onClick={addAllergy}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergies.map((allergy, index) => (
                      <Badge key={index} variant="secondary">
                        {allergy}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => removeAllergy(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Medical Conditions</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      placeholder="Add condition"
                      onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                    />
                    <Button size="sm" onClick={addCondition}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.medical_conditions.map((condition, index) => (
                      <Badge key={index} variant="secondary">
                        {condition}
                        <X 
                          className="h-3 w-3 ml-1 cursor-pointer" 
                          onClick={() => removeCondition(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Blood Type</p>
                  <p className="font-medium">{formData.blood_type || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.allergies.length > 0 ? (
                      formData.allergies.map((allergy, index) => (
                        <Badge key={index} variant="destructive">{allergy}</Badge>
                      ))
                    ) : (
                      <p className="text-sm">None listed</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Medical Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.medical_conditions.length > 0 ? (
                      formData.medical_conditions.map((condition, index) => (
                        <Badge key={index} variant="secondary">{condition}</Badge>
                      ))
                    ) : (
                      <p className="text-sm">None listed</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Doctor & Insurance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Healthcare Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold">Primary Doctor</Label>
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="Doctor's name"
                      value={formData.primary_doctor.name || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        primary_doctor: { ...formData.primary_doctor, name: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Phone number"
                      value={formData.primary_doctor.phone || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        primary_doctor: { ...formData.primary_doctor, phone: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Practice/Hospital"
                      value={formData.primary_doctor.practice || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        primary_doctor: { ...formData.primary_doctor, practice: e.target.value }
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Insurance Information</Label>
                  <div className="space-y-2 mt-2">
                    <Input
                      placeholder="Insurance provider"
                      value={formData.insurance_info.provider || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        insurance_info: { ...formData.insurance_info, provider: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Policy number"
                      value={formData.insurance_info.policyNumber || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        insurance_info: { ...formData.insurance_info, policyNumber: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Group number"
                      value={formData.insurance_info.groupNumber || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        insurance_info: { ...formData.insurance_info, groupNumber: e.target.value }
                      })}
                    />
                    <Input
                      placeholder="Insurance phone"
                      value={formData.insurance_info.phone || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        insurance_info: { ...formData.insurance_info, phone: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Primary Doctor</p>
                  {formData.primary_doctor.name ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{formData.primary_doctor.name}</p>
                      {formData.primary_doctor.practice && (
                        <p className="text-muted-foreground">{formData.primary_doctor.practice}</p>
                      )}
                      {formData.primary_doctor.phone && (
                        <p className="text-muted-foreground">{formData.primary_doctor.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Insurance</p>
                  {formData.insurance_info.provider ? (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{formData.insurance_info.provider}</p>
                      {formData.insurance_info.policyNumber && (
                        <p className="text-muted-foreground">Policy: {formData.insurance_info.policyNumber}</p>
                      )}
                      {formData.insurance_info.groupNumber && (
                        <p className="text-muted-foreground">Group: {formData.insurance_info.groupNumber}</p>
                      )}
                      {formData.insurance_info.phone && (
                        <p className="text-muted-foreground">{formData.insurance_info.phone}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not set</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}