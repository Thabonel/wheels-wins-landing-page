import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FlaggedPost {
  id: string; content: string; author: string; flagged: boolean; reported_at: string;
}

const ContentModeration = () => {
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setTimeout(() => {
      setPosts([
        {
          id: "p1", content: "Sample post flagged for review.", author: "John Smith", flagged: true,
 reported_at: new Date().toISOString(),
        },
      ]);
      setLoading(false);

    }, 500);
  }, []);

  const handleAction = (id: string, action: "approve" | "remove") => {
    // Simulate the action locally
    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  return (
    <div className="p-4">
      {loading && <p>Loading flagged posts...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <>
          <h2 className="text-xl font-bold mb-2">Flagged Content</h2>
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent>
                <p className="mb-2">{post.content}</p>
                <p className="text-sm text-gray-500">By: {post.author} - Reported: {new Date(post.reported_at).toLocaleString()}</p>
                <div className="mt-4 space-x-2">
                  <Button variant="outline" onClick={() => handleAction(post.id, "approve")}>Approve</Button>
                  <Button variant="destructive" onClick={() => handleAction(post.id, "remove")}>Remove</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
};

export default ContentModeration;