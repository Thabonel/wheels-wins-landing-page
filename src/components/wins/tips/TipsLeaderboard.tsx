import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeaderboardUser } from "./types";
import SavingsChallengeModal from "./SavingsChallengeModal";

interface LeaderboardProps {
  leaderboardData: LeaderboardUser[];
}

export default function TipsLeaderboard({ leaderboardData }: LeaderboardProps) {
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  return (
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
          onClick={() => setChallengeModalOpen(true)}
        >
          Join Savings Challenge
        </Button>
      </CardFooter>
      
      <SavingsChallengeModal 
        open={challengeModalOpen} 
        onOpenChange={setChallengeModalOpen} 
      />
    </Card>
  );
}
