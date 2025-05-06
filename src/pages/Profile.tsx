import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RegionSelector from "@/components/RegionSelector";
import { useRegion } from "@/context/RegionContext";

export default function ProfilePage() {
  const { region, setRegion } = useRegion();
  const [isCouple, setIsCouple] = useState(false);
  const [fuelType, setFuelType] = useState<string>("");

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* Identity */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <Input type="file" />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input placeholder="John Smith" />
          </div>
          <div className="space-y-2">
            <Label>Nickname (for social)</Label>
            <Input placeholder="GreyNomadJohn" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value="thabone10@gmail.com" disabled />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <RegionSelector defaultValue={region} onRegionChange={setRegion} />
          </div>
          <div className="space-y-2">
            <Label>Travel Style</Label>
            <Select
              value={isCouple ? "couple" : "solo"}
              onValueChange={(val) => setIsCouple(val === "couple")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Solo or Couple?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCouple && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Partner's Name</Label>
                <Input placeholder="Mary Smith" />
              </div>
              <div className="space-y-2">
                <Label>Partner's Email</Label>
                <Input placeholder="mary@example.com" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Partner's Profile Picture</Label>
                <Input type="file" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Your Vehicle Setup</h2>
          <div className="space-y-2">
            <Label>Vehicle Type</Label>
            <Input placeholder="RV, 4WD, Caravan..." />
          </div>
          <div className="space-y-2">
            <Label>Make / Model / Year</Label>
            <Input placeholder="Toyota LandCruiser 2022" />
          </div>
          <div className="space-y-2">
            <Label>Fuel Type</Label>
            <Select
              value={fuelType}
              onValueChange={(val) => setFuelType(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Petrol">Petrol</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Are you towing?</Label>
            <Input placeholder="Type, weight, make/model" />
          </div>
          <div className="space-y-2">
            <Label>Are you towing a second vehicle?</Label>
            <Input placeholder="e.g. Suzuki Jimny, 1.2T" />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Travel Preferences</h2>
          <div className="space-y-2">
            <Label>Max comfortable daily driving (km)</Label>
            <Input placeholder="e.g. 300" />
          </div>
          <div className="space-y-2">
            <Label>Preferred camp types</Label>
            <Input placeholder="Free, Paid, Bush, RV Park..." />
          </div>
          <div className="space-y-2">
            <Label>Accessibility or mobility needs?</Label>
            <Input placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Pets on board?</Label>
            <Input placeholder="e.g. 2 dogs" />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button>Save Profile</Button>
      </div>
    </div>
  );
}
