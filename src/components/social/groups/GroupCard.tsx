
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin } from "lucide-react";
import { SocialGroup } from "../types";

interface GroupCardProps {
  group: SocialGroup;
  isJoined: boolean;
  onSelectGroup: (group: SocialGroup) => void;
  onJoinGroup: (groupId: string) => void;
}

export default function GroupCard({ group, isJoined, onSelectGroup, onJoinGroup }: GroupCardProps) {
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
    <Card className="overflow-hidden flex flex-col">
      <div className="h-40 overflow-hidden cursor-pointer" onClick={() => onSelectGroup(group)}>
        <img 
          src={group.cover} 
          alt={group.name} 
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <h4 className="font-semibold text-lg cursor-pointer" onClick={() => onSelectGroup(group)}>
            {group.name}
          </h4>
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
        {group.isAdmin && (
          <Badge className="bg-purple-500 mt-1">Admin</Badge>
        )}
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <p className="text-sm text-gray-700 line-clamp-2">{group.description}</p>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button 
          variant="default"
          className="flex-1 mr-2"
          onClick={() => onSelectGroup(group)}
        >
          View Group
        </Button>
        {!group.isAdmin && (
          <Button 
            variant={isJoined ? "outline" : "secondary"} 
            className="flex-1 ml-2"
            onClick={() => onJoinGroup(group.id.toString())}
          >
            {isJoined ? "Leave" : "Join"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
