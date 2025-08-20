import { MapPin, Mountain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Difficulty } from './hooks/use-trip-planning';
import { RouteFormProps } from './types';

const RouteForm = ({ startLocation, setStartLocation, endLocation, setEndLocation, difficulty, setDifficulty }: RouteFormProps) => {
  // Handler to properly type the difficulty change
  const handleDifficultyChange = (value: string) => {
    // Type assertion to ensure the value is a valid Difficulty
    setDifficulty(value as Difficulty);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="start-location">Starting Point</Label>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Input 
            id="start-location" 
            placeholder="Enter starting location" 
            value={startLocation} 
            onChange={(e) => setStartLocation(e.target.value)} 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="end-location">Destination</Label>
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <Input 
            id="end-location" 
            placeholder="Enter destination" 
            value={endLocation} 
            onChange={(e) => setEndLocation(e.target.value)} 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="difficulty">Travel Difficulty</Label>
        <div className="flex items-center space-x-2">
          <Mountain className="h-4 w-4 text-muted-foreground" />
          <Select value={difficulty} onValueChange={handleDifficultyChange}>
            <SelectTrigger id="difficulty">
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy (Main Highways)</SelectItem>
              <SelectItem value="moderate">Moderate (Mixed Roads)</SelectItem>
              <SelectItem value="challenging">Challenging (Scenic Backroads)</SelectItem>
              <SelectItem value="expert">Expert (Mountain Passes)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default RouteForm;