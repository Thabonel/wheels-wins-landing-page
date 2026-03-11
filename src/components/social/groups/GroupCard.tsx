
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MapPin, Crown, Globe, Camera, Sparkles } from "lucide-react";
import { SocialGroup } from "../types";
import { useState } from "react";

interface GroupCardProps {
  group: SocialGroup;
  isJoined: boolean;
  onSelectGroup: (group: SocialGroup) => void;
  onJoinGroup: (groupId: string) => void;
}

export default function GroupCard({ group, isJoined, onSelectGroup, onJoinGroup }: GroupCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const getActivityBadge = (activityLevel: string) => {
    const badges = {
      'active': <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 shadow-sm"><Sparkles size={12} className="mr-1" />Active</Badge>,
      'new': <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-0 shadow-sm">New</Badge>,
      'quiet': <Badge className="bg-gray-500 hover:bg-gray-600 text-white border-0 shadow-sm">Quiet</Badge>
    };
    return badges[activityLevel as keyof typeof badges] || null;
  };

  const getLocationDisplay = () => {
    if (group.location === 'Unknown' || !group.location) {
      return (
        <div className="flex items-center text-sm text-muted-foreground">
          <Globe size={14} className="mr-1.5" />
          Global Community
        </div>
      );
    }
    return (
      <div className="flex items-center text-sm text-muted-foreground">
        <MapPin size={14} className="mr-1.5" />
        {group.location}
      </div>
    );
  };

  const getMemberText = () => {
    if (group.members === 0) return "Be the first member!";
    if (group.members === 1) return "1 pioneer member";
    return `${group.members.toLocaleString()} members`;
  };

  const getDescriptionDisplay = () => {
    if (!group.description || group.description.trim().length === 0) {
      return "A vibrant community of travelers sharing adventures, tips, and unforgettable experiences from the road.";
    }
    return group.description;
  };

  const generateFallbackImage = () => {
    const gradients = [
      'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500',
      'bg-gradient-to-br from-green-400 via-blue-500 to-purple-600',
      'bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500',
      'bg-gradient-to-br from-indigo-400 via-purple-500 to-blue-600',
      'bg-gradient-to-br from-orange-400 via-red-500 to-purple-600'
    ];
    const gradientIndex = group.name.length % gradients.length;
    return gradients[gradientIndex];
  };

  return (
    <Card className="overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300 group border-muted hover:border-border">
      {/* Enhanced Image Section */}
      <div
        className="h-44 overflow-hidden cursor-pointer relative"
        onClick={() => onSelectGroup(group)}
      >
        {!imageError ? (
          <>
            {imageLoading && (
              <div className={`absolute inset-0 ${generateFallbackImage()} flex items-center justify-center`}>
                <Camera size={32} className="text-white/70" />
              </div>
            )}
            <img
              src={group.cover}
              alt={group.name}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
              }}
            />
          </>
        ) : (
          <div className={`w-full h-full ${generateFallbackImage()} flex flex-col items-center justify-center text-white`}>
            <Camera size={28} className="mb-2 opacity-80" />
            <span className="text-sm font-medium text-center px-4">
              {group.name}
            </span>
          </div>
        )}

        {/* Activity Badge Overlay */}
        <div className="absolute top-3 right-3">
          {getActivityBadge(group.activityLevel)}
        </div>

        {/* Admin Crown Badge */}
        {group.isAdmin && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-sm">
              <Crown size={12} className="mr-1" />
              Admin
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3 pt-4">
        <div className="flex justify-between items-start mb-2">
          <h4
            className="font-bold text-lg cursor-pointer hover:text-primary transition-colors line-clamp-1"
            onClick={() => onSelectGroup(group)}
            title={group.name}
          >
            {group.name}
          </h4>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users size={14} className="mr-1.5 text-primary" />
            <span className="font-medium">{getMemberText()}</span>
          </div>

          {getLocationDisplay()}
        </div>
      </CardHeader>

      <CardContent className="pb-4 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {getDescriptionDisplay()}
        </p>
      </CardContent>

      <CardFooter className="pt-0 pb-4 gap-2">
        <Button
          variant="default"
          className="flex-1 font-medium"
          onClick={() => onSelectGroup(group)}
        >
          View Group
        </Button>
        {!group.isAdmin && (
          <Button
            variant={isJoined ? "outline" : "secondary"}
            className={`flex-1 font-medium ${isJoined ? 'border-red-200 text-red-700 hover:bg-red-50' : ''}`}
            onClick={() => onJoinGroup(group.id.toString())}
          >
            {isJoined ? "Leave" : "Join"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
