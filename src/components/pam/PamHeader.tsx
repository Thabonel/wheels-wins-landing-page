import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPublicAssetUrl } from "@/utils/publicAssets";

interface PamHeaderProps {
  region: string;
}

const PamHeader = ({ region }: PamHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <CardHeader className="pb-2 sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-blue-50 flex items-center justify-between">
      <CardTitle className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-blue-200/50 shadow-sm animate-pulse-slow">
            <AvatarImage
              src={getPublicAssetUrl('Pam.webp')}
              alt="Pam"
              className="object-cover"
            />
            <AvatarFallback className="bg-blue-100 text-blue-500 text-xl">
              PA
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-400 rounded-full border-2 border-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-blue-900">Chat with Pam</span>
          <span className="text-sm text-muted-foreground">
            Your {region} Travel Companion
          </span>
        </div>
      </CardTitle>

      {/* Removed top mic button */}
    </CardHeader>
  );
};

export default PamHeader;
