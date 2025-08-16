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

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
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

  // Set up real-time subscription
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchIssues();

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

  useEffect(() => {
    // Prefill URL with current location if running client-side
    if (typeof window !== "undefined" && !url) {
      setUrl(window.location.href.replace('/qa', ''));
    }
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setUrl(typeof window !== "undefined" ? window.location.href.replace('/qa', '') : "");
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

      const { error } = await supabase
        .from('qa_issues')
        .insert({
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          priority,
          category,
          status,
          notes: notes.trim(),
          screenshot_url,
          created_by: user.id,
          updated_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Issue added successfully",
      });

      resetForm();
    } catch (error) {
      console.error('Error adding issue:', error);
      toast({
        title: "Error",
        description: "Failed to add issue",
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
              <button onClick={exportCSV} className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50">
                Export CSV
              </button>
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
            <input
              className="lg:col-span-3 w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Location / URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
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