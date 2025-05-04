
import { Input } from "@/components/ui/input";
import { 
  DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export default function TipShareForm() {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Share a Money-Saving Tip</DrawerTitle>
        <DrawerDescription>
          Help fellow travelers save money on the road
        </DrawerDescription>
      </DrawerHeader>
      <div className="px-4 py-2">
        <form className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="tip-title">Title</label>
            <Input id="tip-title" placeholder="Give your tip a clear title" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="tip-category">Category</label>
            <select 
              id="tip-category" 
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
            >
              <option value="">Select a category</option>
              <option value="fuel">Fuel Savings</option>
              <option value="food">Food & Groceries</option>
              <option value="camp">Camping Deals</option>
              <option value="fun">Entertainment</option>
              <option value="other">Other Savings</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="tip-content">Your Tip</label>
            <textarea 
              id="tip-content" 
              rows={4}
              placeholder="Describe your money-saving tip in detail"
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
            ></textarea>
          </div>
        </form>
      </div>
      <DrawerFooter>
        <Button>Submit Tip</Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
