import { Label } from '@/components/ui/label';
import { PoiFormProps } from './types';

const PoiForm = ({ selectedPois, handlePoiChange }: PoiFormProps) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label>Points of Interest</Label>
        <div className="space-y-2">
          {['rv_parks', 'dump_stations', 'propane', 'groceries', 'fuel', 'scenic', 'attractions', 'repair'].map((poi) => (
            <div key={poi} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id={poi} 
                className="h-4 w-4 rounded" 
                checked={selectedPois.includes(poi)}
                onChange={() => handlePoiChange(poi)}
              />
              <Label htmlFor={poi}>
                {poi === 'rv_parks' && 'RV Parks & Campgrounds'}
                {poi === 'dump_stations' && 'Dump Stations'}
                {poi === 'propane' && 'Propane Refill Stations'}
                {poi === 'groceries' && 'Grocery Stores'}
                {poi === 'fuel' && 'Gas Stations'}
                {poi === 'scenic' && 'Scenic Viewpoints'}
                {poi === 'attractions' && 'Tourist Attractions'}
                {poi === 'repair' && 'RV Repair Services'}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PoiForm;