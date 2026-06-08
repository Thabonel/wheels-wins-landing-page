import { getAllSkills, matchSkillsFromMessage, getSkillById } from './skillsService';
import { logSkillUsage } from './usageLogService';
import { buildSpecialistContext } from './memoryPreferencesService';
import { executeTripSpecialist } from '../specialists/tripSpecialist';
import { executeBudgetSpecialist } from '../specialists/budgetSpecialist';
import { executeFuelSpecialist } from '../specialists/fuelSpecialist';
import { executeVehicleSpecialist } from '../specialists/vehicleSpecialist';
import { executeSafetySpecialist } from '../specialists/safetySpecialist';
import { executeShopSpecialist } from '../specialists/shopSpecialist';
import { executeWeeklySummarySpecialist } from '../specialists/weeklySummarySpecialist';
import type { SkillMatchResult, SpecialistContext, SpecialistResult } from './types';

const SKILL_TO_SPECIALIST: Record<string, (ctx: SpecialistContext, message: string) => Promise<SpecialistResult>> = {
  'Trip Planning': executeTripSpecialist,
  'Budget Review': executeBudgetSpecialist,
  'Fuel Cost Estimate': executeFuelSpecialist,
  'Vehicle Reminder': executeVehicleSpecialist,
  'Weekly Travel Summary': executeWeeklySummarySpecialist,
  'Money-Making Suggestions': executeBudgetSpecialist,
  'Safety Checklist': executeSafetySpecialist,
  'Shop/Resources Suggestion': executeShopSpecialist,
};

export interface RoutedSkillResponse {
  handled: boolean;
  response?: string;
  skillName?: string;
  skillId?: string;
}

export async function routeMessageThroughSkills(
  userId: string,
  message: string,
  token?: string
): Promise<RoutedSkillResponse> {
  try {
    const skills = await getAllSkills();

    if (skills.length === 0) {
      return { handled: false };
    }

    const matches = matchSkillsFromMessage(message, skills);

    if (matches.length === 0) {
      return { handled: false };
    }

    const bestMatch = matches[0];

    if (bestMatch.confidence < 0.1 && bestMatch.matchedPhrases.length < 1) {
      return { handled: false };
    }

    const specialistFn = SKILL_TO_SPECIALIST[bestMatch.skill.name];

    if (!specialistFn) {
      return { handled: false };
    }

    const context = await buildSpecialistContext(userId);
    const specialistContext: SpecialistContext = {
      userId,
      token,
      ...context
    };

    const result = await specialistFn(specialistContext, message);

    if (result.success) {
      const inputSummary = message.substring(0, 200);
      const outputSummary = result.message.substring(0, 200);

      logSkillUsage(userId, bestMatch.skill.id, inputSummary, outputSummary, true).catch(() => {});
    } else {
      logSkillUsage(
        userId,
        bestMatch.skill.id,
        message.substring(0, 200),
        '',
        false,
        result.error || 'Unknown error'
      ).catch(() => {});
    }

    return {
      handled: true,
      response: result.message,
      skillName: bestMatch.skill.name,
      skillId: bestMatch.skill.id
    };
  } catch (err) {
    console.error('Error in skill routing:', err);
    return { handled: false };
  }
}
