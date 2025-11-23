
import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Settings,
  MessageSquare,
  BarChart3,
  Shield,
  FileText,
  ShoppingCart,
  Package,
  Brain,
  Activity,
  TestTube,
  MessageCircle,
  Database,
  MapPin,
  Bug,
  Zap,
  UserCheck
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activeSection,
  setActiveSection,
}) => {
  const isMobile = useIsMobile();

  const sidebarItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Users', icon: Users },
    { name: 'Content Moderation', icon: Shield },
    { name: 'Analytics', icon: BarChart3 },
    { name: 'Data Collector', icon: Database },
    { name: 'Chat Logs', icon: MessageSquare },
    { name: 'User Feedback', icon: MessageCircle },
    { name: 'Learning Dashboard', icon: Brain },
    { name: 'AI Observability', icon: Activity },
    { name: 'AI Router', icon: Brain },
    { name: 'AI Index', icon: Database },
    { name: 'Testing Dashboard', icon: TestTube },
    { name: 'Integration Testing', icon: TestTube },
    { name: 'Performance Test', icon: Zap },
    { name: 'Auth Debug', icon: Bug },
    { name: 'Auth Testing', icon: UserCheck },
    { name: 'Shop Management', icon: ShoppingCart },
    { name: 'Amazon Products', icon: Package },
    { name: 'Trip Templates', icon: MapPin },
    { name: 'Support Tickets', icon: FileText },
    { name: 'Settings', icon: Settings },
  ];

  const handleItemClick = (itemName: string) => {
    setActiveSection(itemName);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Shield className="h-6 w-6" />
          <span className="">Admin Panel</span>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4 lg:p-6">
          {sidebarItems.map((item) => (
            <Button
              key={item.name}
              variant={activeSection === item.name ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleItemClick(item.name)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:bg-background lg:pt-16">
      <SidebarContent />
    </div>
  );
};

export default AdminSidebar;
