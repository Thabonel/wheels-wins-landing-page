
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function RVStorageOrganizer() {
  const [storage, setStorage] = useState([
    {
      id: 1,
      name: "Kitchen Drawer",
      isOpen: false,
      items: [
        { id: 1, name: "Plates", packed: true },
        { id: 2, name: "Utensils", packed: true },
        { id: 3, name: "Cups", packed: false },
        { id: 4, name: "Cooking Tools", packed: true },
      ]
    },
    {
      id: 2,
      name: "Bathroom Cabinet",
      isOpen: false,
      items: [
        { id: 1, name: "Towels", packed: true },
        { id: 2, name: "Toiletries", packed: true },
        { id: 3, name: "First Aid Kit", packed: true },
      ]
    },
    {
      id: 3,
      name: "Under Bed Storage",
      isOpen: false,
      items: [
        { id: 1, name: "Extra Bedding", packed: true },
        { id: 2, name: "Winter Clothes", packed: false },
        { id: 3, name: "Hiking Gear", packed: false },
      ]
    },
    {
      id: 4,
      name: "Exterior Compartment",
      isOpen: false,
      items: [
        { id: 1, name: "Electrical Hookup", packed: true },
        { id: 2, name: "Water Hose", packed: true },
        { id: 3, name: "Leveling Blocks", packed: false },
        { id: 4, name: "Outdoor Chairs", packed: false },
      ]
    },
  ]);

  const toggleDrawerState = (drawerId: number) => {
    setStorage(storage.map(drawer => 
      drawer.id === drawerId ? { ...drawer, isOpen: !drawer.isOpen } : drawer
    ));
  };

  const toggleItemPacked = (drawerId: number, itemId: number) => {
    setStorage(storage.map(drawer => {
      if (drawer.id !== drawerId) return drawer;
      
      const updatedItems = drawer.items.map(item => 
        item.id === itemId ? { ...item, packed: !item.packed } : item
      );
      
      return { ...drawer, items: updatedItems };
    }));
  };

  const isDrawerComplete = (drawer: any) => {
    return drawer.items.every(item => item.packed);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
      
      <div className="space-y-4">
        {storage.map(drawer => {
          const isComplete = isDrawerComplete(drawer);
          
          return (
            <Card 
              key={drawer.id} 
              className={`${isComplete ? 'border-green-200' : 'border-amber-200'} transition-colors`}
            >
              <CardContent className="p-0">
                <Accordion type="single" collapsible>
                  <AccordionItem value={`drawer-${drawer.id}`} className="border-0">
                    <div className={`p-4 flex justify-between items-center ${isComplete ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <div>
                        <AccordionTrigger className="hover:no-underline py-0">
                          <span className="font-bold">{drawer.name}</span>
                        </AccordionTrigger>
                        <p className="text-sm text-gray-600">
                          {drawer.items.filter(i => i.packed).length} of {drawer.items.length} items packed
                        </p>
                      </div>
                      <Button
                        onClick={() => toggleDrawerState(drawer.id)}
                        variant="outline"
                        size="sm"
                      >
                        {drawer.isOpen ? 'Close' : 'Open'}
                      </Button>
                    </div>
                    <AccordionContent>
                      <div className="p-4 pt-2 border-t">
                        <ul className="space-y-2">
                          {drawer.items.map(item => (
                            <li 
                              key={item.id} 
                              className="flex items-center p-2 rounded hover:bg-gray-50"
                            >
                              <label className="flex items-center cursor-pointer w-full">
                                <input 
                                  type="checkbox" 
                                  checked={item.packed} 
                                  onChange={() => toggleItemPacked(drawer.id, item.id)}
                                  className="mr-3 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className={`${item.packed ? 'line-through text-gray-500' : ''}`}>
                                  {item.name}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Pam's suggestion */}
      <div className="mt-8">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold">Pam suggests:</h3>
            <p className="mt-2">You're missing some items for your upcoming trip. Would you like help creating a shopping list for the remaining items?</p>
            <div className="mt-4">
              <Button className="mr-3">
                Create Shopping List
              </Button>
              <Button variant="outline">
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
