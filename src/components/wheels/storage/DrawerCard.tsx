
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DrawerItem {
  id: string;
  name: string;
  packed: boolean;
  quantity?: number;
}

interface DrawerCardProps {
  drawer: {
    id: string;
    name: string;
    photo_url?: string;
    isOpen: boolean;
    items: DrawerItem[];
  };
  onToggleDrawer: (id: string) => void;
  onToggleItem: (drawerId: string, itemId: string) => void;
}

const DrawerCard: React.FC<DrawerCardProps> = ({ drawer, onToggleDrawer, onToggleItem }) => {
  const isDrawerComplete = drawer.items.length > 0 && drawer.items.every((i) => i.packed);

  return (
    <Card className={`${isDrawerComplete ? "border-green-200" : "border-amber-200"}`}>
      <CardContent className="p-0">
        <div className={`p-4 flex justify-between items-center ${isDrawerComplete ? "bg-green-50" : "bg-amber-50"}`}>
          <div className="flex items-center space-x-4">
            {drawer.photo_url && (
              <img src={drawer.photo_url} alt={drawer.name} className="w-10 h-10 object-cover rounded" />
            )}
            <div>
              <span className="font-bold">{drawer.name}</span>
              <p className="text-sm text-gray-600">
                {drawer.items.filter((i) => i.packed).length} of {drawer.items.length} items packed
              </p>
            </div>
          </div>
          <Button onClick={() => onToggleDrawer(drawer.id)} variant="outline" size="sm">
            {drawer.isOpen ? "Close" : "Open"}
          </Button>
        </div>
        {drawer.isOpen && (
          <div className="p-4 pt-2 border-t">
            {drawer.items.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in this drawer</p>
            ) : (
              <ul className="space-y-2">
                {drawer.items.map((item) => (
                  <li key={item.id} className="flex items-center">
                    <label className="flex items-center w-full cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.packed}
                        onChange={() => onToggleItem(drawer.id, item.id)}
                        className="mr-3 h-5 w-5"
                      />
                      <span className={`${item.packed ? "line-through text-gray-500" : ""}`}>
                        {item.name}
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-gray-400 ml-2">x{item.quantity}</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DrawerCard;
