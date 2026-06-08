import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAllSkills, getSkillUsageForUser } from '@/services/pam/skills';
import type { PamSkill, PamSkillUsageLog } from '@/services/pam/skills/types';

interface SkillWithUsage extends PamSkill {
  usageCount: number;
  lastUsed?: string;
}

export function MyPamSkills() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkills() {
      if (!user) return;

      try {
        const [allSkills, usageLogs] = await Promise.all([
          getAllSkills(),
          getSkillUsageForUser(user.id, 100)
        ]);

        const usageMap = new Map<string, { count: number; lastUsed?: string }>();
        for (const log of usageLogs) {
          const existing = usageMap.get(log.skill_id) || { count: 0 };
          usageMap.set(log.skill_id, {
            count: existing.count + 1,
            lastUsed: !existing.lastUsed ? log.created_at : existing.lastUsed
          });
        }

        const skillsWithUsage = allSkills.map(skill => ({
          ...skill,
          usageCount: usageMap.get(skill.id)?.count || 0,
          lastUsed: usageMap.get(skill.id)?.lastUsed
        }));

        setSkills(skillsWithUsage);
      } catch (err) {
        setError('Failed to load skills');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadSkills();
  }, [user]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading your Pam skills...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">My Pam Skills</h2>
      <p className="text-muted-foreground mb-6">
        Pam can help with these skills. Just ask Pam in the chat to use any of them.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {skills.map(skill => (
          <Card key={skill.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{skill.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
              </div>
              {skill.usageCount > 0 ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {skill.trigger_phrases.slice(0, 3).map(phrase => (
                <span key={phrase} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  "{phrase}"
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="capitalize">{skill.category}</span>
              {skill.usageCount > 0 && (
                <span>Used {skill.usageCount} time{skill.usageCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {skills.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No skills available. Please check back later.
        </p>
      )}
    </Card>
  );
}
