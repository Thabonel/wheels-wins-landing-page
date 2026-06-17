import { supabase } from '@/integrations/supabase/client';
import type { PamSkill, PamSkillCategory, SkillMatchResult } from './types';

const SKILL_CACHE_TTL = 5 * 60 * 1000;
let cachedSkills: PamSkill[] | null = null;
let cacheTimestamp = 0;

export async function getAllSkills(): Promise<PamSkill[]> {
  if (cachedSkills && Date.now() - cacheTimestamp < SKILL_CACHE_TTL) {
    return cachedSkills;
  }

  const { data, error } = await supabase
    .from('pam_skills')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to load PAM skills:', error);
    return [];
  }

  cachedSkills = data as PamSkill[];
  cacheTimestamp = Date.now();
  return cachedSkills;
}

export async function getSkillById(skillId: string): Promise<PamSkill | null> {
  const { data, error } = await supabase
    .from('pam_skills')
    .select('*')
    .eq('id', skillId)
    .single();

  if (error) {
    console.error('Failed to load skill:', error);
    return null;
  }

  return data as PamSkill;
}

export async function getSkillsByCategory(category: PamSkillCategory): Promise<PamSkill[]> {
  const { data, error } = await supabase
    .from('pam_skills')
    .select('*')
    .eq('category', category)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to load skills by category:', error);
    return [];
  }

  return data as PamSkill[];
}

export function matchSkillsFromMessage(message: string, skills: PamSkill[]): SkillMatchResult[] {
  const normalizedMessage = message.toLowerCase().trim();
  const results: SkillMatchResult[] = [];

  for (const skill of skills) {
    const matchedPhrases: string[] = [];

    for (const phrase of skill.trigger_phrases) {
      if (normalizedMessage.includes(phrase.toLowerCase())) {
        matchedPhrases.push(phrase);
      }
    }

    if (matchedPhrases.length > 0) {
      const confidence = Math.min(matchedPhrases.length / skill.trigger_phrases.length, 1.0);
      results.push({ skill, confidence, matchedPhrases });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}

export function clearSkillCache(): void {
  cachedSkills = null;
  cacheTimestamp = 0;
}
