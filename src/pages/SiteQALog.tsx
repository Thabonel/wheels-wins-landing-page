import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Priority = "Critical" | "High" | "Medium" | "Low";
type Category = "UI/Design" | "Functionality" | "Content" | "Performance" | "Integration" | "Other";
type Status = "Open" | "Closed";

type Issue = {
  id: string;
  title: string;
  description: string;
  url: string;
  priority: Priority;
  category: Category;
  status: Status;
  created_at: string;
  updated_at: string;
  notes: string;
  screenshot_url?: string;
  created_by?: string;
  updated_by?: string;
  creator_email?: string;
};

const priorities: Priority[] = ["Critical", "High", "Medium", "Low"];
const categories: Category[] = ["UI/Design", "Functionality", "Content", "Performance", "Integration", "Other"];
const statuses: Status[] = ["Open", "Closed"];

// Page routes configuration
const pageRoutes = [
  { value: "custom", label: "Custom URL (Enter manually)", group: "Custom" },
  // Main Pages
  { value: "/", label: "Home", group: "Main" },
  { value: "/wheels", label: "Wheels - Trip Planning", group: "Main" },
  { value: "/you", label: "You - Profile & Settings", group: "Main" },
  { value: "/wins", label: "Wins - Financial Overview", group: "Main" },
  { value: "/social", label: "Social - Community", group: "Main" },
  { value: "/shop", label: "Shop - Store", group: "Main" },
  { value: "/profile", label: "Profile", group: "Main" },
  // Wins Sub-pages
  { value: "/wins#expenses", label: "Wins - Expenses", group: "Financial" },
  { value: "/wins#income", label: "Wins - Income", group: "Financial" },
  { value: "/wins#budgets", label: "Wins - Budgets", group: "Financial" },
  { value: "/wins#tips", label: "Wins - Tips & Tricks", group: "Financial" },
  { value: "/wins#money-maker", label: "Wins - Money Maker", group: "Financial" },
  // Authentication
  { value: "/login", label: "Login", group: "Authentication" },
  { value: "/signup", label: "Sign Up", group: "Authentication" },
  { value: "/onboarding", label: "Onboarding", group: "Authentication" },
  { value: "/reset-password", label: "Password Reset", group: "Authentication" },
  { value: "/update-password", label: "Update Password", group: "Authentication" },
  // Payment
  { value: "/payment-success", label: "Payment Success", group: "Payment" },
  { value: "/payment-canceled", label: "Payment Canceled", group: "Payment" },
  { value: "/cancel-trial", label: "Cancel Trial", group: "Payment" },
  { value: "/thank-you/digistore24", label: "Thank You", group: "Payment" },
  // Legal
  { value: "/terms", label: "Terms of Service", group: "Legal" },
  { value: "/privacy", label: "Privacy Policy", group: "Legal" },
  { value: "/cookies", label: "Cookie Policy", group: "Legal" },
  // Admin & Testing
  { value: "/admin", label: "Admin Dashboard", group: "Admin" },
  { value: "/qa", label: "QA Tracking", group: "Admin" },
  { value: "/pam-voice-test", label: "PAM Voice Test", group: "Testing" },
];

function clsx(...cn: (string | false | null | undefined)[]) {
  return cn.filter(Boolean).join(" ");
}

function Badge({ children, variant }: { children: React.ReactNode; variant: Priority | Status }) {
  const color =
    variant === "Critical"
      ? "bg-red-100 text-red-800 ring-red-200"
      : variant === "High"
      ? "bg-orange-100 text-orange-800 ring-orange-200"
      : variant === "Medium"
      ? "bg-yellow-100 text-yellow-800 ring-yellow-200"
      : variant === "Low"
      ? "bg-green-100 text-green-800 ring-green-200"
      : variant === "Open"
      ? "bg-blue-100 text-blue-800 ring-blue-200"
      : "bg-zinc-100 text-zinc-800 ring-zinc-200";
  return (
    <span className={clsx("inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ring-1", color)}>
      {children}
    </span>
  );
}

export default function SiteQALog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "All">("All");
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<"priority" | "date" | "category" | "status">("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  // Import feature state
  const [legacyIssues, setLegacyIssues] = useState<Issue[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [jsonImportFile, setJsonImportFile] = useState<File | null>(null);
  const [showJsonImportDialog, setShowJsonImportDialog] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPage, setSelectedPage] = useState("custom");
  const [customUrl, setCustomUrl] = useState("");
  const [priority, setPriority] = useState<Priority>("High");
  const [category, setCategory] = useState<Category>("Functionality");
  const [status, setStatus] = useState<Status>("Open");
  const [notes, setNotes] = useState("");
  const [screenshot, setScreenshot] = useState<File | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch issues from Supabase
  const fetchIssues = async () => {
    try {
      const { data, error } = await supabase
        .from('qa_issues')
        .select(`
          *,
          creator:created_by(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedIssues = data?.map(issue => ({
        ...issue,
        creator_email: issue.creator?.email
      })) || [];

      setIssues(formattedIssues);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast({
        title: "Error",
        description: "Failed to load issues",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for legacy localStorage data
  const checkLegacyData = () => {
    try {
      const stored = localStorage.getItem("qa_issues");
      if (stored) {
        const parsedIssues = JSON.parse(stored);
        if (Array.isArray(parsedIssues) && parsedIssues.length > 0) {
          setLegacyIssues(parsedIssues);
          return true;
        }
      }
    } catch (error) {
      console.error("Error reading legacy data:", error);
    }
    return false;
  };

  // Import legacy issues to Supabase
  const importLegacyIssues = async (deleteAfterImport: boolean = false) => {
    if (!user || legacyIssues.length === 0) return;

    setImporting(true);
    setImportProgress(0);
    
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < legacyIssues.length; i++) {
        const legacyIssue = legacyIssues[i];
        setImportProgress(Math.round(((i + 1) / legacyIssues.length) * 100));

        try {
          // Skip if issue might already exist (check by title and description)
          const { data: existing } = await supabase
            .from('qa_issues')
            .select('id')
            .eq('title', legacyIssue.title)
            .eq('description', legacyIssue.description || '')
            .single();

          if (existing) {
            console.log(`Skipping duplicate: ${legacyIssue.title}`);
            continue;
          }

          // Import the issue
          const { error } = await supabase
            .from('qa_issues')
            .insert({
              title: legacyIssue.title,
              description: legacyIssue.description || '',
              url: legacyIssue.url || '',
              priority: legacyIssue.priority || 'Medium',
              category: legacyIssue.category || 'Other',
              status: legacyIssue.status || 'Open',
              notes: legacyIssue.notes || '',
              created_by: user.id,
              updated_by: user.id,
              created_at: legacyIssue.created_at || new Date().toISOString(),
              updated_at: legacyIssue.updated_at || new Date().toISOString()
            });

          if (error) throw error;
          successCount++;
        } catch (error) {
          console.error(`Failed to import issue: ${legacyIssue.title}`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast({
          title: "Import successful",
          description: `Imported ${successCount} issue${successCount > 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        });

        // Clean up localStorage if requested
        if (deleteAfterImport && successCount > 0) {
          localStorage.removeItem("qa_issues");
          setLegacyIssues([]);
        }

        // Refresh the issues list
        fetchIssues();
      } else if (errorCount > 0) {
        toast({
          title: "Import failed",
          description: `Could not import any issues. ${errorCount} failed.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import error",
        description: "An error occurred during import",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setShowImportDialog(false);
      setImportProgress(0);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchIssues();
    checkLegacyData();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('qa_issues_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'qa_issues' },
        (payload) => {
          // Refresh issues when any change occurs
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Helper function to generate full URL based on selected page
  const getFullUrl = () => {
    if (selectedPage === "custom") {
      return customUrl;
    }
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      return baseUrl + selectedPage;
    }
    return selectedPage;
  };

  function resetForm() {
    setTitle("");
    setDescription("");
    // Keep the selected page but clear custom URL if it was custom
    if (selectedPage === "custom") {
      setCustomUrl("");
    }
    setPriority("High");
    setCategory("Functionality");
    setStatus("Open");
    setNotes("");
    setScreenshot(undefined);
    fileInputRef.current && (fileInputRef.current.value = "");
  }

  async function uploadScreenshot(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('qa-screenshots')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('qa-screenshots')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      toast({
        title: "Error",
        description: "Failed to upload screenshot",
        variant: "destructive",
      });
      return null;
    }
  }

  async function addIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setUploading(true);
    try {
      let screenshot_url = null;
      if (screenshot) {
        screenshot_url = await uploadScreenshot(screenshot);
      }

      const { data, error } = await supabase
        .from('qa_issues')
        .insert({
          title: title.trim(),
          description: description.trim(),
          url: getFullUrl().trim(),
          priority,
          category,
          status,
          notes: notes.trim(),
          screenshot_url,
          created_by: user.id,
          updated_by: user.id
        })
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('Issue added successfully:', data);

      toast({
        title: "Success",
        description: "Issue added successfully",
      });

      resetForm();
    } catch (error: any) {
      console.error('Error adding issue:', error);
      
      let errorMessage = "Failed to add issue";
      if (error.code === '42P01') {
        errorMessage = "QA issues table not found. Please run the database migration.";
      } else if (error.code === '42501') {
        errorMessage = "Permission denied. Please check your authentication.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: Status) {
    if (!user) return;

    try {
      const newStatus = currentStatus === "Open" ? "Closed" : "Open";
      const { error } = await supabase
        .from('qa_issues')
        .update({ 
          status: newStatus,
          updated_by: user.id
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Issue marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  }

  async function updateNotes(id: string, newNotes: string) {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('qa_issues')
        .update({ 
          notes: newNotes,
          updated_by: user.id
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notes:', error);
      toast({
        title: "Error",
        description: "Failed to update notes",
        variant: "destructive",
      });
    }
  }

  async function removeIssue(id: string) {
    if (!user) return;

    if (!confirm("Are you sure you want to delete this issue?")) return;

    try {
      const { error } = await supabase
        .from('qa_issues')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Issue deleted",
        description: "The issue has been removed",
      });
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast({
        title: "Error",
        description: "Failed to delete issue",
        variant: "destructive",
      });
    }
  }

  function handleScreenshotUpload(file?: File | null) {
    if (!file) return setScreenshot(undefined);
    setScreenshot(file);
  }

  function priorityRank(p: Priority) {
    return p === "Critical" ? 4 : p === "High" ? 3 : p === "Medium" ? 2 : 1;
  }

  const filtered = useMemo(() => {
    let list = issues.slice();

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q) ||
          i.url?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q) ||
          i.creator_email?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "All") list = list.filter((i) => i.status === filterStatus);
    if (filterPriority !== "All") list = list.filter((i) => i.priority === filterPriority);
    if (filterCategory !== "All") list = list.filter((i) => i.category === filterCategory);

    list.sort((a, b) => {
      if (sortBy === "priority") {
        const diff = priorityRank(a.priority) - priorityRank(b.priority);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "date") {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "category") {
        const diff = a.category.localeCompare(b.category);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortBy === "status") {
        const diff = a.status.localeCompare(b.status);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });

    return list;
  }, [issues, query, filterStatus, filterPriority, filterCategory, sortBy, sortDir]);

  function exportCSV() {
    const headers = [
      "id",
      "title",
      "description",
      "url",
      "priority",
      "category",
      "status",
      "created_at",
      "created_by",
      "notes",
    ];
    const rows = filtered.map((i) =>
      [
        i.id,
        i.title,
        i.description?.replace(/\n/g, "\\n"),
        i.url,
        i.priority,
        i.category,
        i.status,
        i.created_at,
        i.creator_email || 'Unknown',
        i.notes?.replace(/\n/g, "\\n"),
      ]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site_qa_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const exportData = {
      exportDate: new Date().toISOString(),
      issueCount: filtered.length,
      issues: filtered.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        url: issue.url,
        priority: issue.priority,
        category: issue.category,
        status: issue.status,
        notes: issue.notes,
        screenshot_url: issue.screenshot_url,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        created_by: issue.creator_email || 'Unknown'
      }))
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa_issues_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Handle different JSON formats
      let issuesToImport = [];
      
      if (data.issues && Array.isArray(data.issues)) {
        // Standard export format
        issuesToImport = data.issues;
      } else if (Array.isArray(data)) {
        // Direct array of issues
        issuesToImport = data;
      } else if (data.qa_issues) {
        // Possible localStorage format
        issuesToImport = data.qa_issues;
      } else {
        throw new Error("Invalid JSON format: couldn't find issues array");
      }

      if (issuesToImport.length === 0) {
        throw new Error("No issues found in JSON file");
      }

      console.log(`Starting import of ${issuesToImport.length} issues...`);
      setImporting(true);
      setImportProgress(0);
      let successCount = 0;
      let errorCount = 0;
      let skipCount = 0;

      for (let i = 0; i < issuesToImport.length; i++) {
        const issue = issuesToImport[i];
        setImportProgress(Math.round(((i + 1) / issuesToImport.length) * 100));

        try {
          // Validate required fields
          if (!issue.title) {
            console.warn(`Skipping issue without title at index ${i}`);
            skipCount++;
            continue;
          }

          // Check for duplicates - simplified check
          const { data: existing, error: checkError } = await supabase
            .from('qa_issues')
            .select('id')
            .eq('title', issue.title)
            .maybeSingle();

          if (checkError) {
            console.error('Error checking for duplicate:', checkError);
          }

          if (existing) {
            console.log(`Skipping duplicate: ${issue.title}`);
            skipCount++;
            continue;
          }

          // Import the issue with better error handling
          const { data: inserted, error } = await supabase
            .from('qa_issues')
            .insert({
              title: issue.title.substring(0, 255), // Ensure title isn't too long
              description: issue.description || '',
              url: issue.url || '',
              priority: ['Critical', 'High', 'Medium', 'Low'].includes(issue.priority) ? issue.priority : 'Medium',
              category: ['UI/Design', 'Functionality', 'Content', 'Performance', 'Integration', 'Other'].includes(issue.category) ? issue.category : 'Other',
              status: ['Open', 'Closed'].includes(issue.status) ? issue.status : 'Open',
              notes: issue.notes || '',
              screenshot_url: issue.screenshot_url || null,
              created_by: user?.id,
              updated_by: user?.id,
              created_at: issue.created_at || new Date().toISOString(),
              updated_at: issue.updated_at || new Date().toISOString()
            })
            .select();

          if (error) {
            console.error(`Failed to import issue "${issue.title}":`, error);
            errorCount++;
          } else {
            console.log(`Successfully imported: ${issue.title}`, inserted);
            successCount++;
          }
        } catch (error) {
          console.error(`Failed to import issue: ${issue.title}`, error);
          errorCount++;
        }
      }

      // Show detailed results
      console.log(`Import complete: ${successCount} imported, ${skipCount} skipped, ${errorCount} failed`);
      
      if (successCount > 0) {
        toast({
          title: "JSON import completed",
          description: `Imported ${successCount} issue${successCount > 1 ? 's' : ''}${skipCount > 0 ? `, ${skipCount} skipped (duplicates)` : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });
        fetchIssues();
      } else if (skipCount > 0) {
        toast({
          title: "All issues already exist",
          description: `Skipped ${skipCount} duplicate${skipCount > 1 ? 's' : ''}. No new issues to import.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Import failed",
          description: `Could not import any issues. Check browser console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("JSON import error:", error);
      toast({
        title: "Import error",
        description: error instanceof Error ? error.message : "Invalid JSON file",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      setImportProgress(0);
      setShowJsonImportDialog(false);
      setJsonImportFile(null);
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Login Required</h2>
          <p className="text-zinc-600">Please log in to access the QA tracking system.</p>
          <a href="/login" className="mt-4 inline-block rounded-lg bg-black text-white px-6 py-2 hover:opacity-90">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* Import Dialog Modal */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Import Legacy Issues</h2>
              <p className="text-sm text-zinc-600 mt-1">
                Found {legacyIssues.length} issue{legacyIssues.length > 1 ? 's' : ''} in your browser storage
              </p>
            </div>
            
            <div className="p-6 max-h-[50vh] overflow-y-auto">
              {importing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-zinc-600">Importing... {importProgress}%</p>
                  <div className="w-full bg-zinc-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {legacyIssues.slice(0, 5).map((issue, idx) => (
                      <div key={idx} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{issue.title}</p>
                            {issue.description && (
                              <p className="text-sm text-zinc-600 mt-1">{issue.description}</p>
                            )}
                          </div>
                          <Badge variant={issue.priority}>{issue.priority}</Badge>
                        </div>
                      </div>
                    ))}
                    {legacyIssues.length > 5 && (
                      <p className="text-sm text-zinc-600 text-center">
                        ...and {legacyIssues.length - 5} more
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Screenshots cannot be imported automatically. 
                      You'll need to re-add them manually if needed.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {!importing && (
              <div className="p-6 border-t bg-zinc-50">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="deleteAfterImport"
                      className="rounded border-zinc-300"
                    />
                    <span className="text-sm">Delete browser storage after import</span>
                  </label>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowImportDialog(false)}
                      className="rounded-lg border px-4 py-2 text-sm hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const deleteAfter = (document.getElementById('deleteAfterImport') as HTMLInputElement)?.checked;
                        importLegacyIssues(deleteAfter);
                      }}
                      className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:opacity-90"
                    >
                      Import All Issues
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Import Dialog */}
      {showJsonImportDialog && jsonImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Import JSON File</h2>
              <p className="text-sm text-zinc-600 mt-1">
                Ready to import issues from: {jsonImportFile.name}
              </p>
            </div>
            
            <div className="p-6">
              {importing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-zinc-600">Importing... {importProgress}%</p>
                  <div className="w-full bg-zinc-200 rounded-full h-2 mt-4">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Import Features:</strong>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Duplicate detection - existing issues won't be re-imported</li>
                        <li>Preserves original dates and metadata</li>
                        <li>Validates data format before import</li>
                        <li>Shows progress during import</li>
                      </ul>
                    </p>
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Make sure the JSON file was exported from this QA system or follows the same format.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {!importing && (
              <div className="p-6 border-t bg-zinc-50">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowJsonImportDialog(false);
                      setJsonImportFile(null);
                    }}
                    className="rounded-lg border px-4 py-2 text-sm hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (jsonImportFile) {
                        await importJSON(jsonImportFile);
                        setShowJsonImportDialog(false);
                        setJsonImportFile(null);
                      }
                    }}
                    className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:opacity-90"
                  >
                    Start Import
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legacy Data Banner */}
      {legacyIssues.length > 0 && !showImportDialog && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  Found {legacyIssues.length} issue{legacyIssues.length > 1 ? 's' : ''} in browser storage from your previous session. 
                  Import them to the cloud for team collaboration?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLegacyIssues([])}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
                >
                  Import to Cloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Website QA & Fix Log</h1>
              <p className="text-sm text-zinc-600">
                Team issue tracking - {issues.length} total issues, {issues.filter(i => i.status === 'Open').length} open
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-600">Logged in as: {user.email}</span>
              <div className="flex items-center gap-1">
                <button onClick={exportCSV} className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
                  Export CSV
                </button>
                <button onClick={exportJSON} className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
                  Export JSON
                </button>
                <label className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 cursor-pointer">
                  Import JSON
                  <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setJsonImportFile(file);
                        setShowJsonImportDialog(true);
                        e.target.value = ''; // Reset input
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={addIssue} className="border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            <input
              className="lg:col-span-3 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="lg:col-span-3 flex gap-2">
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
              >
                {/* Group pages by category */}
                {Array.from(new Set(pageRoutes.map(p => p.group))).map(group => (
                  <optgroup key={group} label={group}>
                    {pageRoutes
                      .filter(page => page.group === group)
                      .map(page => (
                        <option key={page.value} value={page.value}>
                          {page.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              {selectedPage === "custom" && (
                <input
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  placeholder="Enter custom URL"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
              )}
            </div>
            <select
              className="lg:col-span-2 w-full rounded-lg border px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  Priority: {p}
                </option>
              ))}
            </select>
            <select
              className="lg:col-span-2 w-full rounded-lg border px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
            <select
              className="lg:col-span-2 w-full rounded-lg border px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
            <textarea
              className="lg:col-span-8 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Description (what's wrong, steps to reproduce)…"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <textarea
              className="lg:col-span-4 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Internal notes (optional)…"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="lg:col-span-8 flex items-center gap-3">
              <label className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50 cursor-pointer">
                {screenshot ? "Change Screenshot" : "Add Screenshot"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleScreenshotUpload(e.target.files?.[0] ?? null)}
                />
              </label>
              {screenshot && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-600">{screenshot.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(undefined);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div className="lg:col-span-4 flex items-center justify-end gap-2">
              <button type="button" onClick={resetForm} className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
                Clear
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-black text-white px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Adding..." : "Add Issue"}
              </button>
            </div>
          </div>
        </form>
      </header>

      {/* Filters & Search */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              placeholder="Search issues…"
              className="w-full sm:w-64 rounded-lg border px-3 py-2 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as Status | "All")}
            >
              {["All", ...statuses].map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | "All")}
            >
              {["All", ...priorities].map((p) => (
                <option key={p} value={p}>
                  Priority: {p}
                </option>
              ))}
            </select>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category | "All")}
            >
              {["All", ...categories].map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-600">Sort by</label>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="priority">Priority</option>
              <option value="date">Date</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
              title="Toggle sort direction"
              type="button"
            >
              {sortDir === "asc" ? "Asc ↑" : "Desc ↓"}
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="overflow-hidden rounded-xl border">
          <table className="min-w-full divide-y">
            <thead className="bg-zinc-50">
              <tr className="text-left text-xs font-semibold text-zinc-600">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Date / Reporter</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-zinc-500">
                    No issues yet. Add your first item above.
                  </td>
                </tr>
              )}
              {filtered.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(i.id, i.status)}
                      className={clsx(
                        "rounded-lg border px-2 py-1 text-xs hover:bg-zinc-50",
                        i.status === "Open" ? "border-blue-200" : "border-zinc-200"
                      )}
                      title="Toggle status"
                    >
                      <Badge variant={i.status}>{i.status}</Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{i.title}</div>
                    {i.description && <div className="mt-1 text-sm text-zinc-600 whitespace-pre-wrap">{i.description}</div>}
                    {i.screenshot_url && (
                      <a
                        href={i.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs underline text-zinc-600"
                      >
                        View screenshot
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {i.url ? (
                      <a className="text-sm underline" href={i.url} target="_blank" rel="noreferrer">
                        {i.url}
                      </a>
                    ) : (
                      <span className="text-sm text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={"Low"}>{i.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={i.priority}>{i.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-zinc-700">
                      {format(new Date(i.created_at), 'MMM d, h:mm a')}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {i.creator_email || 'Unknown user'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <textarea
                      className="w-64 rounded-lg border px-2 py-1 text-sm"
                      rows={3}
                      placeholder="Add notes…"
                      value={i.notes || ''}
                      onChange={(e) => updateNotes(i.id, e.target.value)}
                      onBlur={(e) => updateNotes(i.id, e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeIssue(i.id)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                      title="Delete"
                      disabled={i.created_by !== user.id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}