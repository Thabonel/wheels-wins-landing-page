import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/common/AnimatedDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/common/AnimatedAlertDialog";
import { Trash2, Plus } from "lucide-react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useUser } from "@supabase/auth-helpers-react";

interface CategoryManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CategoryManagementModal({
  open,
  onOpenChange
}: CategoryManagementModalProps) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      if (!user) return;
      const { data, error } = await supabase
        .from("budgets")
        .select("category")
        .eq("user_id", user.id);
      if (!error && data) {
        const unique = Array.from(new Set(data.map((row) => row.category)));
        setCategories(unique);
      }
    }

    fetchCategories();
  }, [user, supabase, open]);

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !user) return;

    // Insert new category as a blank budget row
    const { error } = await supabase.from("budgets").insert([
      {
        user_id: user.id,
        category: newCategory.trim(),
        budgeted_amount: 0,
      }
    ]);

    if (!error) {
      setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
    }
  };

  const handleDeleteClick = (category: string) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete || !user) return;

    await supabase
      .from("budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("category", categoryToDelete);

    setCategories(categories.filter((c) => c !== categoryToDelete));
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Budget Categories</DialogTitle>
            <DialogDescription>
              Add or remove budget categories to better organize your planning.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-end gap-2 my-4">
            <div className="flex-1">
              <Input
                placeholder="New Category Name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <Button onClick={handleAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.map((category) => (
              <div key={category} className="flex justify-between items-center p-3 border rounded-md">
                <span>{category}</span>
                {category !== "Fuel" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(category)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{categoryToDelete}" category?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
