
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileHeaderProps {
  profile: any;
  region: string;
}

export const ProfileHeader = ({ profile, region }: ProfileHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      {profile && (
        <div className="flex gap-2">
          <Badge variant="outline">{profile.role || 'user'}</Badge>
          <Badge variant={profile.status === 'active' ? 'default' : 'destructive'}>
            {profile.status || 'active'}
          </Badge>
        </div>
      )}
    </div>
  );
};

export const ProfileStatus = ({ profile, region }: ProfileHeaderProps) => {
  if (!profile) return null;

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">Profile Active</span>
        </div>
        <p className="text-sm text-green-600 mt-1">
          Role: {profile.role || 'user'} | Region: {profile.region || region} | Status: {profile.status || 'active'}
        </p>
      </CardContent>
    </Card>
  );
};
