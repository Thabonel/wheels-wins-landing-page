
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, MapPin, PlusCircle } from "lucide-react";
import { useSocialData } from "@/components/social/useSocialData";

export default function SocialGroups() {
  const { groups, recommendedGroups } = useSocialData();
  const [joinedGroups, setJoinedGroups] = useState<number[]>([]);
  
  const handleJoinGroup = (groupId: number) => {
    if (joinedGroups.includes(groupId)) {
      setJoinedGroups(joinedGroups.filter(id => id !== groupId));
      toast.info("You've left the group");
    } else {
      setJoinedGroups([...joinedGroups, groupId]);
      toast.success("You've joined the group!");
    }
  };
  
  const getActivityBadge = (activityLevel: string) => {
    switch (activityLevel) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'new':
        return <Badge className="bg-blue-500">New</Badge>;
      case 'quiet':
        return <Badge className="bg-gray-500">Quiet</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Pam's recommendations */}
      <div className="bg-purple-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Pam's Group Suggestions</h2>
        <p className="text-gray-700 mb-4">
          Based on your profile and current location, you might enjoy these groups:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedGroups.map((group) => (
            <Card key={group.id} className="border border-purple-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{group.name}</h4>
                  <p className="text-sm text-gray-600">{group.members} members</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleJoinGroup(group.id)}>
                  <PlusCircle size={16} className="mr-1" /> Join
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      {/* All Groups */}
      <div>
        <h3 className="text-xl font-semibold mb-6">Browse All Groups</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="overflow-hidden flex flex-col">
              <div className="h-40 overflow-hidden">
                <img 
                  src={group.cover} 
                  alt={group.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-lg">{group.name}</h4>
                  {getActivityBadge(group.activityLevel)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users size={16} className="mr-1" /> {group.members} members
                </div>
                {group.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={16} className="mr-1" /> {group.location}
                  </div>
                )}
              </CardHeader>
              <CardContent className="pb-2 flex-grow">
                <p className="text-sm text-gray-700 line-clamp-2">{group.description}</p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button 
                  variant={joinedGroups.includes(group.id) ? "outline" : "default"} 
                  className="w-full"
                  onClick={() => handleJoinGroup(group.id)}
                >
                  {joinedGroups.includes(group.id) ? "Leave Group" : "Join Group"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Create Group Banner */}
      <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
        <CardContent>
          <h4 className="text-lg font-semibold">Start your own group</h4>
          <p className="text-gray-700 mb-4">
            Have a shared interest or location? Create a group for like-minded travelers!
          </p>
          <Button>
            <PlusCircle size={18} className="mr-2" /> Create Group
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
