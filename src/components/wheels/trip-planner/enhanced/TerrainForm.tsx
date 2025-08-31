import { Mountain } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TerrainFormProps } from './types';

const TerrainForm = ({ selectedTerrainTypes, handleTerrainChange }: TerrainFormProps) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="terrain-type">Road Types</Label>
        <div className="grid grid-cols-2 gap-2">
          {['highways', 'backroads', 'scenic_routes', 'mountain_roads', 'coastal', 'desert'].map((terrain) => (
            <div key={terrain} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id={`terrain-${terrain}`} 
                className="h-4 w-4 rounded" 
                checked={selectedTerrainTypes.includes(terrain)}
                onChange={() => handleTerrainChange(terrain)}
              />
              <Label htmlFor={`terrain-${terrain}`}>
                {terrain === 'highways' && 'Interstate Highways'}
                {terrain === 'backroads' && 'Country Backroads'}
                {terrain === 'scenic_routes' && 'Scenic Routes'}
                {terrain === 'mountain_roads' && 'Mountain Roads'}
                {terrain === 'coastal' && 'Coastal Drives'}
                {terrain === 'desert' && 'Desert Roads'}
              </Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="elevation">Road Preference</Label>
        <div className="flex items-center space-x-2">
          <Mountain className="h-4 w-4 text-muted-foreground" />
          <Select>
            <SelectTrigger id="elevation">
              <SelectValue placeholder="Select road preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flat">Flat Terrain</SelectItem>
              <SelectItem value="rolling">Rolling Hills</SelectItem>
              <SelectItem value="mountainous">Mountainous</SelectItem>
              <SelectItem value="mixed">Mixed Terrain</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TerrainForm;