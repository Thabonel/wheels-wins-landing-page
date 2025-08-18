import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { LeaderboardUser } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trophy, Target, TrendingUp } from "lucide-react";

interface LeaderboardProps {
  leaderboardData: LeaderboardUser[];
}

export default function TipsLeaderboard({ leaderboardData }: LeaderboardProps) {
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinChallenge = async () => {
    setIsJoining(true);
    try {
      // Simulate joining the challenge (in production, this would call an API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Welcome to the Savings Challenge! 🎉", {
        description: "You're now competing with fellow travelers to save more on the road."
      });
      setShowChallengeModal(false);
    } catch (error) {
      toast.error("Failed to join challenge. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Top Savers Community</CardTitle>
        <CardDescription>
          Members with the most savings points from tips, challenges, and budget wins
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboardData.map((user, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="font-bold text-lg w-6 text-center">
                  {index + 1}
                </div>
                <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {index === 0 ? "Mega Saver" : index < 3 ? "Pro Saver" : "Savvy Traveler"}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">{user.points}</div>
                <div className="text-sm text-muted-foreground">points</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setShowChallengeModal(true)}
        >
          Join Savings Challenge
        </Button>
      </CardFooter>
    </Card>

    {/* Savings Challenge Modal */}
    <Dialog open={showChallengeModal} onOpenChange={setShowChallengeModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Join the Monthly Savings Challenge
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">How it works:</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li>• Complete daily savings tips to earn points</li>
                  <li>• Track expenses and stay under budget</li>
                  <li>• Share your wins with the community</li>
                  <li>• Climb the leaderboard and win badges</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">This month's rewards:</p>
                <ul className="text-sm mt-1 space-y-1">
                  <li>• 🥇 Gold: "Mega Saver" badge + 500 points</li>
                  <li>• 🥈 Silver: "Pro Saver" badge + 300 points</li>
                  <li>• 🥉 Bronze: "Smart Saver" badge + 100 points</li>
                </ul>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              The challenge resets monthly. Join anytime to start earning points!
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowChallengeModal(false)}
          >
            Maybe Later
          </Button>
          <Button
            onClick={handleJoinChallenge}
            disabled={isJoining}
          >
            {isJoining ? "Joining..." : "Join Challenge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
