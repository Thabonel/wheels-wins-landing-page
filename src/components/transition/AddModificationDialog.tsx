import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { COMMON_VEHICLE_MODS, type CommonMod } from '@/data/common-vehicle-mods';
import { Plus, X, Link as LinkIcon, Upload, Image as ImageIcon } from 'lucide-react';
import { uploadFile } from '@/utils/fileUploadUtils';

interface AddModificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  profileId: string;
}

interface VendorLink {
  name: string;
  url: string;
}

export const AddModificationDialog: React.FC<AddModificationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  profileId,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCommonMod, setSelectedCommonMod] = useState<string>('');

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('power');
  const [priority, setPriority] = useState<string>('important');
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [timeRequired, setTimeRequired] = useState('');
  const [diyFeasible, setDiyFeasible] = useState(true);
  const [vendorLinks, setVendorLinks] = useState<VendorLink[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Temporary inputs for adding links
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newDependency, setNewDependency] = useState('');

  // Photo upload state
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const handleCommonModSelect = (modName: string) => {
    setSelectedCommonMod(modName);
    if (modName === 'custom') {
      // Clear form for custom entry
      setName('');
      setCategory('power');
      setPriority('important');
      setDescription('');
      setEstimatedCost('');
      setTimeRequired('');
      setDiyFeasible(true);
      setVendorLinks([]);
      setDependencies([]);
      return;
    }

    const mod = COMMON_VEHICLE_MODS.find(m => m.name === modName);
    if (mod) {
      setName(mod.name);
      setCategory(mod.category);
      setPriority(mod.priority);
      setDescription(mod.description);
      setEstimatedCost(mod.estimated_cost.toString());
      setTimeRequired(mod.time_required_hours.toString());
      setDiyFeasible(mod.diy_feasible);
      setVendorLinks(mod.vendor_links || []);
      setDependencies(mod.dependencies || []);
    }
  };

  const handleAddVendorLink = () => {
    if (newLinkName && newLinkUrl) {
      setVendorLinks([...vendorLinks, { name: newLinkName, url: newLinkUrl }]);
      setNewLinkName('');
      setNewLinkUrl('');
    }
  };

  const handleRemoveVendorLink = (index: number) => {
    setVendorLinks(vendorLinks.filter((_, i) => i !== index));
  };

  const handleAddDependency = () => {
    if (newDependency && !dependencies.includes(newDependency)) {
      setDependencies([...dependencies, newDependency]);
      setNewDependency('');
    }
  };

  const handleRemoveDependency = (dep: string) => {
    setDependencies(dependencies.filter(d => d !== dep));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos
    const newPhotos = files.slice(0, 5 - selectedPhotos.length);
    setSelectedPhotos([...selectedPhotos, ...newPhotos]);

    // Create preview URLs
    const newPreviewUrls = newPhotos.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls([...photoPreviewUrls, ...newPreviewUrls]);
  };

  const handleRemovePhoto = (index: number) => {
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index]);

    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Modification name is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upload photos if any selected
      let photoUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        setUploadingPhotos(true);
        toast({
          title: 'Uploading photos...',
          description: `Uploading ${selectedPhotos.length} photo(s)`,
        });

        const uploadPromises = selectedPhotos.map(photo =>
          uploadFile(photo, 'vehicle', false)
        );
        const uploadResults = await Promise.all(uploadPromises);

        photoUrls = uploadResults
          .filter(result => result.url)
          .map(result => result.url!);

        if (photoUrls.length < selectedPhotos.length) {
          toast({
            title: 'Warning',
            description: `Only ${photoUrls.length} of ${selectedPhotos.length} photos uploaded successfully`,
            variant: 'destructive',
          });
        }

        setUploadingPhotos(false);
      }

      const { error } = await supabase.from('transition_vehicle_mods').insert({
        profile_id: profileId,
        name: name.trim(),
        category,
        priority,
        description: description.trim() || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        time_required_hours: timeRequired ? parseInt(timeRequired) : null,
        diy_feasible: diyFeasible,
        vendor_links: vendorLinks.length > 0 ? vendorLinks : [],
        dependencies: dependencies.length > 0 ? dependencies : [],
        photo_urls: photoUrls.length > 0 ? photoUrls : [],
        notes: notes.trim() || null,
        status: 'planned',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Modification added successfully',
      });

      // Reset form
      setName('');
      setCategory('power');
      setPriority('important');
      setDescription('');
      setEstimatedCost('');
      setTimeRequired('');
      setDiyFeasible(true);
      setVendorLinks([]);
      setDependencies([]);
      setNotes('');
      setSelectedCommonMod('');

      // Clear photos
      photoPreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setSelectedPhotos([]);
      setPhotoPreviewUrls([]);

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding modification:', error);
      toast({
        title: 'Error',
        description: 'Failed to add modification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Vehicle Modification</DialogTitle>
          <DialogDescription>
            Select a common modification or create a custom one
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common Modifications Dropdown */}
          <div className="space-y-2">
            <Label>Quick Select (Optional)</Label>
            <Select value={selectedCommonMod} onValueChange={handleCommonModSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a common modification..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Modification</SelectItem>
                <SelectItem value="" disabled className="font-semibold">
                  — Power Systems —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'power').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
                <SelectItem value="" disabled className="font-semibold">
                  — Water Systems —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'water').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
                <SelectItem value="" disabled className="font-semibold">
                  — Comfort —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'comfort').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
                <SelectItem value="" disabled className="font-semibold">
                  — Safety & Recovery —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'safety').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
                <SelectItem value="" disabled className="font-semibold">
                  — Storage —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'storage').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
                <SelectItem value="" disabled className="font-semibold">
                  — Exterior —
                </SelectItem>
                {COMMON_VEHICLE_MODS.filter(m => m.category === 'exterior').map(mod => (
                  <SelectItem key={mod.name} value={mod.name}>
                    {mod.name} (${mod.estimated_cost})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Modification Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Solar Panel System"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="power">Power</SelectItem>
                  <SelectItem value="water">Water</SelectItem>
                  <SelectItem value="comfort">Comfort</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="essential">Essential</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="nice-to-have">Nice-to-have</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="2500.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time Required (hours)</Label>
              <Input
                id="time"
                type="number"
                value={timeRequired}
                onChange={(e) => setTimeRequired(e.target.value)}
                placeholder="16"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the modification..."
              rows={3}
            />
          </div>

          {/* DIY Feasible */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="diy"
              checked={diyFeasible}
              onCheckedChange={(checked) => setDiyFeasible(checked as boolean)}
            />
            <Label htmlFor="diy" className="cursor-pointer">
              DIY Feasible (can be installed yourself)
            </Label>
          </div>

          {/* Vendor Links */}
          <div className="space-y-2">
            <Label>Vendor Links</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Vendor name"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
              />
              <Input
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddVendorLink}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {vendorLinks.map((link, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  <LinkIcon className="h-3 w-3" />
                  {link.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveVendorLink(idx)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-2">
            <Label>Dependencies (other mods required first)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Battery Bank Installation"
                value={newDependency}
                onChange={(e) => setNewDependency(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddDependency}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="gap-1">
                  {dep}
                  <button
                    type="button"
                    onClick={() => handleRemoveDependency(dep)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or installation tips..."
              rows={2}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos (Max 5)</Label>
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={selectedPhotos.length >= 5 || loading}
                className="cursor-pointer"
              />
              {selectedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviewUrls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
                        {selectedPhotos[idx].name.substring(0, 20)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Modification'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
