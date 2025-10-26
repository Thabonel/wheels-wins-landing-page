import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wrench,
  DollarSign,
  Clock,
  User,
  Link as LinkIcon,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  GripVertical,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface VehicleModification {
  id: string;
  name: string;
  category: 'power' | 'water' | 'comfort' | 'safety' | 'storage' | 'exterior' | 'other';
  priority: 'essential' | 'important' | 'nice-to-have';
  status: 'planned' | 'in_progress' | 'complete';
  estimated_cost?: number;
  actual_cost?: number;
  time_required_hours?: number;
  diy_feasible: boolean;
  dependencies?: string[];
  vendor_links?: { name: string; url: string }[];
  photo_urls?: string[];
  description?: string;
  notes?: string;
  completion_date?: string;
}

interface ModificationCardProps {
  modification: VehicleModification;
  onEdit?: (mod: VehicleModification) => void;
  onDelete?: (id: string) => void;
}

const categoryColors = {
  power: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  water: 'bg-blue-100 text-blue-800 border-blue-300',
  comfort: 'bg-purple-100 text-purple-800 border-purple-300',
  safety: 'bg-red-100 text-red-800 border-red-300',
  storage: 'bg-green-100 text-green-800 border-green-300',
  exterior: 'bg-gray-100 text-gray-800 border-gray-300',
  other: 'bg-slate-100 text-slate-800 border-slate-300',
};

const priorityColors = {
  essential: 'bg-red-50 text-red-700 border-red-200',
  important: 'bg-orange-50 text-orange-700 border-orange-200',
  'nice-to-have': 'bg-blue-50 text-blue-700 border-blue-200',
};

export const ModificationCard: React.FC<ModificationCardProps> = ({
  modification,
  onEdit,
  onDelete,
}) => {
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: modification.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setShowPhotoViewer(true);
  };

  const handlePrevPhoto = () => {
    if (modification.photo_urls) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? modification.photo_urls!.length - 1 : prev - 1
      );
    }
  };

  const handleNextPhoto = () => {
    if (modification.photo_urls) {
      setCurrentPhotoIndex((prev) =>
        prev === modification.photo_urls!.length - 1 ? 0 : prev + 1
      );
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                </div>
                <CardTitle className="text-base">{modification.name}</CardTitle>
              </div>
              {modification.description && (
                <CardDescription className="text-sm">
                  {modification.description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className={categoryColors[modification.category]} variant="outline">
              {modification.category}
            </Badge>
            <Badge className={priorityColors[modification.priority]} variant="outline">
              {modification.priority}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {/* Cost Information */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>
                {modification.status === 'complete' && modification.actual_cost
                  ? `Actual: $${modification.actual_cost.toFixed(2)}`
                  : modification.estimated_cost
                  ? `Est: $${modification.estimated_cost.toFixed(2)}`
                  : 'No cost estimate'}
              </span>
            </div>
            {modification.time_required_hours && (
              <div className="flex items-center gap-1 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{modification.time_required_hours}h</span>
              </div>
            )}
          </div>

          {/* DIY Indicator */}
          <div className="flex items-center gap-2 text-sm">
            {modification.diy_feasible ? (
              <div className="flex items-center gap-1 text-green-600">
                <User className="h-4 w-4" />
                <span>DIY Feasible</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-orange-600">
                <Wrench className="h-4 w-4" />
                <span>Professional Install</span>
              </div>
            )}
          </div>

          {/* Dependencies */}
          {modification.dependencies && modification.dependencies.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div>
                <span className="text-gray-600 font-medium">Dependencies:</span>
                <div className="text-gray-500 text-xs mt-1">
                  {modification.dependencies.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Vendor Links */}
          {modification.vendor_links && modification.vendor_links.length > 0 && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-blue-500" />
              <div className="flex flex-wrap gap-1">
                {modification.vendor_links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Photo Gallery */}
          {modification.photo_urls && modification.photo_urls.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600 font-medium">
                  {modification.photo_urls.length} photo{modification.photo_urls.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {modification.photo_urls.slice(0, 4).map((url, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded border border-gray-200 overflow-hidden cursor-pointer hover:border-purple-500 transition-colors group"
                    onClick={() => handlePhotoClick(idx)}
                  >
                    <img
                      src={url}
                      alt={`${modification.name} - Photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                    {idx === 3 && modification.photo_urls.length > 4 && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          +{modification.photo_urls.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion Date */}
          {modification.status === 'complete' && modification.completion_date && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed {new Date(modification.completion_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(modification)}
                className="flex-1"
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(modification.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Viewer Dialog */}
      {modification.photo_urls && modification.photo_urls.length > 0 && (
        <Dialog open={showPhotoViewer} onOpenChange={setShowPhotoViewer}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {modification.name} - Photo {currentPhotoIndex + 1} of {modification.photo_urls.length}
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={modification.photo_urls[currentPhotoIndex]}
                alt={`${modification.name} - Photo ${currentPhotoIndex + 1}`}
                className="w-full h-auto max-h-[70vh] object-contain rounded"
              />
              {modification.photo_urls.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={handlePrevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {modification.photo_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {modification.photo_urls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhotoIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                      idx === currentPhotoIndex
                        ? 'border-purple-500'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
