import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Search,
  Download,
  Trash2,
  Eye,
  Filter,
  Calendar
} from 'lucide-react';
import { useMedical } from '@/contexts/MedicalContext';
import { format } from 'date-fns';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MedicalRecordType } from '@/types/medical';

export default function MedicalDocuments() {
  const { records, deleteRecord } = useMedical();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Filter records based on search and type
  const filteredRecords = records.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || record.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleDelete = async () => {
    if (selectedRecordId) {
      await deleteRecord(selectedRecordId);
      setDeleteDialogOpen(false);
      setSelectedRecordId(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lab_result': return 'bg-blue-100 text-blue-800';
      case 'prescription': return 'bg-green-100 text-green-800';
      case 'vaccination': return 'bg-purple-100 text-purple-800';
      case 'insurance_card': return 'bg-orange-100 text-orange-800';
      case 'doctor_note': return 'bg-yellow-100 text-yellow-800';
      case 'imaging': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Medical Documents</CardTitle>
          <CardDescription>Upload and manage your medical records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="lab_result">Lab Result</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="insurance_card">Insurance Card</SelectItem>
                <SelectItem value="doctor_note">Doctor Note</SelectItem>
                <SelectItem value="vaccination">Vaccination</SelectItem>
                <SelectItem value="imaging">Imaging</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <Card key={record.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <Badge className={getTypeColor(record.type)}>
                    {record.type.replace('_', ' ')}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{record.title}</CardTitle>
                {record.summary && (
                  <CardDescription className="text-sm line-clamp-2">
                    {record.summary}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {record.test_date && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      Test date: {format(new Date(record.test_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Added {format(new Date(record.created_at), 'MMM d, yyyy')}
                  </div>
                  {record.tags && record.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {record.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {record.document_url && (
                    <Button variant="outline" size="sm">
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedRecordId(record.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No documents found</p>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first medical document to get started'}
              </p>
              {!searchTerm && filterType === 'all' && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Medical Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this medical record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upload Document Dialog */}
      <DocumentUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen} 
      />
    </div>
  );
}