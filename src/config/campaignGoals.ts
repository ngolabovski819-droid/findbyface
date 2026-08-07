// The commercial terms agreed with a client for a campaign — e.g. "deliver N clicks within a
// trial window, valued at $X/click." Optional per campaign; a slug with no entry here just
// doesn't render a goal card anywhere (src/lib/panelStats.ts's getGoalProgress() and every
// caller treat "no entry" as "nothing to show", not an error).
export interface CampaignGoal {
  label: string;
  startDate: string; // ISO date, 'YYYY-MM-DD', interpreted as UTC midnight
  trialDays: number;
  clickTarget: number;
  ratePerClick: number; // USD
}

export const campaignGoals: Record<string, CampaignGoal> = {
  emilylopz: {
    label: '14-Day Trial',
    startDate: '2026-07-24',
    trialDays: 14,
    clickTarget: 250,
    ratePerClick: 1,
  },
  hannazuki: {
    label: '30-Day Trial',
    startDate: '2026-08-01',
    trialDays: 30,
    clickTarget: 225,
    ratePerClick: 1,
  },
  rocketreynaxo: {
    label: '30-Day Trial',
    startDate: '2026-08-01',
    trialDays: 30,
    clickTarget: 225,
    ratePerClick: 1,
  },
};

export function getCampaignGoal(slug: string): CampaignGoal | undefined {
  return campaignGoals[slug];
}
