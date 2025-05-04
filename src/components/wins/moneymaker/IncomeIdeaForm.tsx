
import { Input } from "@/components/ui/input";
import { 
  DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export default function IncomeIdeaForm() {
  return (
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Add New Income Source</DrawerTitle>
        <DrawerDescription>
          Track a new way you're making money while traveling
        </DrawerDescription>
      </DrawerHeader>
      <div className="px-4 py-2">
        <form className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="idea-name">Name</label>
            <Input id="idea-name" placeholder="What is this income source?" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="status">Status</label>
            <select 
              id="status" 
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="planning">Planning</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label htmlFor="monthly-income">Monthly Income ($)</label>
            <Input id="monthly-income" type="number" placeholder="0" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="start-date">Start Date</label>
            <Input id="start-date" type="date" />
          </div>
          <div className="grid gap-2">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes" 
              rows={3}
              placeholder="Additional details about this income source"
              className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
            ></textarea>
          </div>
        </form>
      </div>
      <DrawerFooter>
        <Button>Save Income Source</Button>
        <DrawerClose asChild>
          <Button variant="outline">Cancel</Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
