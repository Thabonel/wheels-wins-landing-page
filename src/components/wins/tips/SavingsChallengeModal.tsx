import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Target, Calendar, DollarSign, Users } from "lucide-react";

interface SavingsChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  duration: string;
  goal: number;
  icon: React.ReactNode;
  difficulty: "easy" | "medium" | "hard";
}

const challenges: Challenge[] = [
  {
    id: "fuel-saver",
    name: "Fuel Saver Challenge",
    description: "Save $100 on fuel costs in 30 days through efficient driving and route planning",
    duration: "30 days",
    goal: 100,
    icon: <Target className="h-5 w-5" />,
    difficulty: "easy"
  },
  {
    id: "grocery-hero",
    name: "Grocery Hero Challenge",
    description: "Cut grocery spending by 25% using meal planning and smart shopping strategies",
    duration: "2 weeks",
    goal: 150,
    icon: <DollarSign className="h-5 w-5" />,
    difficulty: "medium"
  },
  {
    id: "boondocking-master",
    name: "Boondocking Master",
    description: "Save $500 by boondocking for 14 nights instead of paid campgrounds",
    duration: "60 days",
    goal: 500,
    icon: <Trophy className="h-5 w-5" />,
    difficulty: "hard"
  },
  {
    id: "community-challenge",
    name: "Community Savings Sprint",
    description: "Join other travelers to collectively save $10,000 in travel expenses",
    duration: "Monthly",
    goal: 200,
    icon: <Users className="h-5 w-5" />,
    difficulty: "easy"
  }
];

export default function SavingsChallengeModal({ open, onOpenChange }: SavingsChallengeModalProps) {
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [customGoal, setCustomGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinChallenge = async () => {
    if (!selectedChallenge) {
      toast.error("Please select a challenge to join");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call - in production, this would save to database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const challenge = challenges.find(c => c.id === selectedChallenge);
      if (challenge) {
        toast.success(
          `🎉 You've joined the ${challenge.name}!`,
          {
            description: `Your ${challenge.duration} challenge starts now. Good luck saving $${customGoal || challenge.goal}!`
          }
        );
        
        // Reset form and close modal
        setSelectedChallenge("");
        setCustomGoal("");
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Failed to join challenge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-600 bg-green-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "hard": return "text-red-600 bg-red-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Join a Savings Challenge
          </DialogTitle>
          <DialogDescription>
            Choose a challenge that fits your travel style and start saving with the community!
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-4">
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold mb-3 block">Select Your Challenge</Label>
              <RadioGroup value={selectedChallenge} onValueChange={setSelectedChallenge}>
                <div className="space-y-3">
                  {challenges.map((challenge) => (
                    <Card 
                      key={challenge.id} 
                      className={`cursor-pointer transition-all ${
                        selectedChallenge === challenge.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedChallenge(challenge.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={challenge.id} id={challenge.id} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {challenge.icon}
                              <Label 
                                htmlFor={challenge.id} 
                                className="text-base font-semibold cursor-pointer"
                              >
                                {challenge.name}
                              </Label>
                              <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}>
                                {challenge.difficulty}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {challenge.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{challenge.duration}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>Goal: ${challenge.goal}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {selectedChallenge && (
              <div className="space-y-2">
                <Label htmlFor="custom-goal">Custom Savings Goal (Optional)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    id="custom-goal"
                    type="number"
                    placeholder={
                      challenges.find(c => c.id === selectedChallenge)?.goal.toString() || "0"
                    }
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    min="1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Set your own goal or use the recommended amount
                </p>
              </div>
            )}

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-2">Why Join a Challenge?</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Track your progress with real-time updates</li>
                  <li>• Compete with fellow travelers on the leaderboard</li>
                  <li>• Get personalized tips from PAM AI assistant</li>
                  <li>• Earn badges and achievements for milestones</li>
                  <li>• Share strategies with the community</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleJoinChallenge}
            disabled={!selectedChallenge || isSubmitting}
          >
            {isSubmitting ? "Joining..." : "Join Challenge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}