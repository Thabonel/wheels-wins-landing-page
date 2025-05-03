
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const You = () => {
  const { user, isAuthenticated, login } = useAuth();

  const handleLogin = () => {
    login();
    toast.success("Successfully logged in");
  };

  return (
    <div className="pt-24">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAuthenticated ? (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* User Profile Section */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="rounded-full w-20 h-20 object-cover border-2 border-primary"
                    />
                    <div>
                      <h3 className="text-xl font-bold">{user.name}</h3>
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Account Stats */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle>Your Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Wheels</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Friends</div>
                    </div>
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-primary">0</div>
                      <div className="text-sm text-muted-foreground">Points</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <p className="mb-4">No recent activity to show.</p>
                  <p>Your activities will appear here once you start participating.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-3xl font-bold mb-4">Log in to view your profile</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Sign in to access your personal dashboard, track your wheels, wins, and connect with other members.
            </p>
            <Button size="lg" onClick={handleLogin}>
              Log In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default You;
