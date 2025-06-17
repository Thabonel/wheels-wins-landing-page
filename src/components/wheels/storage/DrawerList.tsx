
import { Card, CardContent } from "@/components/ui/card";
import DrawerCard from "./DrawerCard";

interface DrawerItem {
  id: string;
  name: string;
  packed: boolean;
  quantity?: number;
}

interface Drawer {
  id: string;
  name: string;
  photo_url?: string;
  isOpen: boolean;
  items: DrawerItem[];
}

interface DrawerListProps {
  drawers: Drawer[];
  onToggleDrawer: (id: string) => void;
  onToggleItem: (drawerId: string, itemId: string) => void;
}

const DrawerList: React.FC<DrawerListProps> = ({ drawers, onToggleDrawer, onToggleItem }) => {
  if (drawers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500 mb-4">No drawers created yet</p>
          <p className="text-sm text-gray-400">Use the "Add Drawer" button above to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {drawers.map((drawer) => (
        <DrawerCard
          key={drawer.id}
          drawer={drawer}
          onToggleDrawer={onToggleDrawer}
          onToggleItem={onToggleItem}
        />
      ))}
    </div>
  );
};

export default DrawerList;
