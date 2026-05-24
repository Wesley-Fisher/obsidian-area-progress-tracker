import { describe, expect, it } from "vitest";
import type { RequiredAction, Scores, SystemConfig } from "../../core/types";
import { normalizePreviousScores, recomputeDayScores, requirementsMetForArea, buildDailyLog } from "../../core/scoring";

const config: SystemConfig = {
  version: 1,
  areas: [
    { id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 },
    { id: "career", name: "Career", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 5 },
  ],
  groups: [],
  actions: [
    { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 },
    { id: "deep_work", name: "Deep Work", input: { type: "number", step: 45 }, effects: { career: 5 }, groupIds: [], max: 0 },
  ],
  records: [],
  requiredActions: {},
  dailyPlan: { actions: {} },
  weeklyPlan: { startDate: "", actions: {} },
  stats: { startDate: "", entries: [] },
};

describe("normalizePreviousScores", () => {
  it("updates scores as expected", () => {
    const result = normalizePreviousScores(config, {
      health: { score: 600, daysSince: 2 }, // Exists in config, should be preserved
      //career: { score: 700, daysSince: 3 }, // Should fill in with defaults
      // extra area not in config should be ignored
      social: { score: 300, daysSince: 1 },
    });

    expect(result.health).toEqual({ score: 600, daysSince: 2, decayActive: false });
    expect(result.career).toEqual({ score: 500, daysSince: 0, decayActive: false });
    expect((result as Scores).social).toBeUndefined();
  });
});

describe("requirementsMetForArea", () => {
  it("handles undefined requirements", () => {
    const configWithoutReqs: SystemConfig = {
      ...config,
      requiredActions: {},
    };
    expect(requirementsMetForArea(configWithoutReqs, "health", {})).toBe(true);
  }
  );

  it("handles 0-length requirements", () => {
    const configWithoutReqs: SystemConfig = {
      ...config,
      requiredActions: {} as Partial<Record<string, RequiredAction[]>>,
    };
    expect(requirementsMetForArea(configWithoutReqs, "health", {})).toBe(true);
  }
  );

  it("returns true when requirements are met", () => {
    const configWithReqs: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };
    expect(requirementsMetForArea(configWithReqs, "health", { walk: 2 })).toBe(true);
  });

  it("returns false when requirements are not met", () => {
    const configWithReqs: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };
    expect(requirementsMetForArea(configWithReqs, "health", { walk: 1 })).toBe(false);
  });

  it("rejects negative requirements", () => {
    const configWithReqs: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: -2 }],
      },
    };
    expect(requirementsMetForArea(configWithReqs, "health", { walk: 1 })).toBe(false);
  });

  it("rejects invalid action counts", () => {
    const configWithReqs: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: -2 }],
      },
    };
    expect(requirementsMetForArea(configWithReqs, "health", { walk: undefined })).toBe(false);
  });
});

describe("recomputeDayScores", () => {
  it("seeds from baseScore and does not apply decay without a prior day", () => {
    const configWithDecay: SystemConfig = {
      ...config,
      requiredActions: {health: [{ action: "walk", req: 2 }] },
    };
    const res = recomputeDayScores({ config: configWithDecay, previousDayUpdatedScore: undefined, actions: {} });
    expect(res.previousScore.health.score).toBe(500);
    expect(res.startingScore.health.score).toBe(500);
    expect(res.startingScore.health.daysSince).toBe(1);
  });

  it("applies action totals and resets daysSince for touched areas", () => {
    const prev = {
      health: { score: 600, daysSince: 2 },
      career: { score: 700, daysSince: 3 },
    };

    const res = recomputeDayScores({
      config,
      previousDayUpdatedScore: prev,
      actions: { walk: 2, deep_work: 1 },
    });

    // starting score - no decay if not configured
    expect(res.startingScore.health.score).toBe(600);
    expect(res.startingScore.career.score).toBe(700);

    // updated score adds effects
    expect(res.updatedScore.health.score).toBe(600 + 12 * 2);
    expect(res.updatedScore.health.daysSince).toBe(0);

    expect(res.updatedScore.career.score).toBe(700 + 5 * 1);
    expect(res.updatedScore.career.daysSince).toBe(0);
  });

  it("caps action totals at per-action max (if configured)", () => {
    const cappedConfig: SystemConfig = {
      ...config,
      actions: config.actions.map((a) => (a.id === "walk" ? { ...a, max: 1 } : a)),
    };

    const res = recomputeDayScores({
      config: cappedConfig,
      previousDayUpdatedScore: undefined,
      actions: { walk: 5 },
    });

    // base 500, no decay, then walk should only count once
    expect(res.updatedScore.health.score).toBe(500 + 12 * 1);
  });

  it("suppresses unattended decay for an area when requiredActions are met", () => {
    const reqConfig: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };

    // Day 1: no prior day, so startingScore does not decay regardless.
    const d1 = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: undefined, actions: { walk: 2 } });
    expect(d1.startingScore.health.score).toBe(500);
    expect(d1.updatedScore.health.decayActive).toBe(false);

    const d1NotMet = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: undefined, actions: { walk: 1 } });
    expect(d1NotMet.startingScore.health.score).toBe(500);
    expect(d1NotMet.updatedScore.health.decayActive).toBe(true);

    // Day 2: decay is applied based on Day 1's decayActive.
    const d2FromNotMet = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: d1NotMet.updatedScore, actions: {} });
    // Day 1 had +12 (walk once) but still triggers decay into Day 2.
    expect(d2FromNotMet.startingScore.health.score).toBe(502);
    const d2FromMet = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: d1.updatedScore, actions: {} });
    expect(d2FromMet.startingScore.health.score).toBe(524);
  });

  it("does not allow today's actions to undo decay triggered by yesterday", () => {
    const reqConfig: SystemConfig = {
      ...config,
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };

    // Yesterday: did not meet requirements => decayActive true for tomorrow.
    const yesterday = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: undefined, actions: { walk: 1 } });
    expect(yesterday.updatedScore.health.decayActive).toBe(true);

    // Today: even if we meet requirements today, today's starting score should still include yesterday's decay.
    const today = recomputeDayScores({ config: reqConfig, previousDayUpdatedScore: yesterday.updatedScore, actions: { walk: 2 } });
    expect(today.startingScore.health.score).toBe(502);
    // But we set decayActive for the NEXT day based on today's actions.
    expect(today.updatedScore.health.decayActive).toBe(false);
  });

  it("re-activates unattended decay when a follow-up day has no actions (default behavior)", () => {
    // No requiredActions configured: default behavior is "decay into tomorrow unless you touched the area today".
    const d1 = recomputeDayScores({
      config,
      previousDayUpdatedScore: undefined,
      actions: { walk: 1 },
    });

    // Day 1 touched health but not career.
    expect(d1.updatedScore.health.decayActive).toBe(false);
    expect(d1.updatedScore.career.decayActive).toBe(true);

    // Day 2: no actions => should re-activate decay for all areas into Day 3.
    const d2 = recomputeDayScores({
      config,
      previousDayUpdatedScore: d1.updatedScore,
      actions: {},
    });
    expect(d2.startingScore.health.score).toBe(d1.updatedScore.health.score); // no decay into Day 2
    expect(d2.updatedScore.health.decayActive).toBe(true);
    expect(d2.updatedScore.career.decayActive).toBe(true);

    // Day 3: decay should apply based on Day 2 flags.
    const d3 = recomputeDayScores({
      config,
      previousDayUpdatedScore: d2.updatedScore,
      actions: {},
    });
    expect(d3.startingScore.health.score).toBe(d2.updatedScore.health.score - 10);
    expect(d3.startingScore.career.score).toBe(d2.updatedScore.career.score - 5);
  });

  it("always applies dailyDecayAlways when rolling to the next day", () => {
    const configWithAlwaysDecay: SystemConfig = {
      ...config,
      areas: [
        { id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 3, dailyDecayUnattended: 10 },
        { id: "career", name: "Career", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 2, dailyDecayUnattended: 5 },
      ],
    };

    const noUnattendedDecay = recomputeDayScores({
      config: configWithAlwaysDecay,
      previousDayUpdatedScore: {
        health: { score: 600, daysSince: 2, decayActive: false },
        career: { score: 700, daysSince: 3, decayActive: false },
      },
      actions: {},
    });

    expect(noUnattendedDecay.startingScore.health.score).toBe(597);
    expect(noUnattendedDecay.startingScore.career.score).toBe(698);

    const withUnattendedDecay = recomputeDayScores({
      config: configWithAlwaysDecay,
      previousDayUpdatedScore: {
        health: { score: 600, daysSince: 2, decayActive: true },
        career: { score: 700, daysSince: 3, decayActive: true },
      },
      actions: {},
    });

    expect(withUnattendedDecay.startingScore.health.score).toBe(587);
    expect(withUnattendedDecay.startingScore.career.score).toBe(693);
  });
});

describe("buildDailyLog", () => {
  it("Computes daily score from empty new items", () => {
    const configWithDecay: SystemConfig = {
      ...config,
      requiredActions: {health: [{ action: "walk", req: 2 }] },
    };
    const dailyLog = buildDailyLog(configWithDecay, {}, {}, {} );

    expect(dailyLog.previousScore.health.score).toBe(500);
    expect(dailyLog.startingScore.health.score).toBe(500); // No prior-day decay flag available
    expect(dailyLog.updatedScore.health.score).toBe(500);
    expect(dailyLog.startingScore.health.daysSince).toBe(1);
    expect(dailyLog.updatedScore.health.daysSince).toBe(1);

    expect(dailyLog.previousScore.career.score).toBe(500);
    expect(dailyLog.startingScore.career.score).toBe(500); // Had had progress; decay suppressed
    expect(dailyLog.updatedScore.career.score).toBe(500);
    expect(dailyLog.startingScore.career.daysSince).toBe(1);
    expect(dailyLog.updatedScore.career.daysSince).toBe(1);
  });

  it("Computes daily score with new items for today", () => {
    const configWithDecay: SystemConfig = {
      ...config,
      requiredActions: {health: [{ action: "walk", req: 2 }] },
    };
    const dailyLog = buildDailyLog(configWithDecay, {}, {"walk": 2}, {} );

    expect(dailyLog.previousScore.health.score).toBe(500);
    expect(dailyLog.startingScore.health.score).toBe(500); // No prior-day decay applied
    expect(dailyLog.updatedScore.health.score).toBe(524);
    expect(dailyLog.startingScore.health.daysSince).toBe(1);
    expect(dailyLog.updatedScore.health.daysSince).toBe(0);

    expect(dailyLog.previousScore.career.score).toBe(500);
    expect(dailyLog.startingScore.career.score).toBe(500); // Had had progress; decay suppressed
    expect(dailyLog.updatedScore.career.score).toBe(500);
    expect(dailyLog.startingScore.career.daysSince).toBe(1);
    expect(dailyLog.updatedScore.career.daysSince).toBe(1);
  });

  it("Computes daily score with decay and new items for today", () => {
    const configWithDecay: SystemConfig = {
      ...config,
      requiredActions: {health: [{ action: "walk", req: 2 }] },
    };
    const previousScore = {
    "health": {
      "score": 500,
      "daysSince": 1,
      "decayActive": true
    },
    "career": {
      "score": 500,
      "daysSince": 1,
      "decayActive": true
    }
  }
    const dailyLog = buildDailyLog(configWithDecay, previousScore, {"walk": 2}, {} );

    expect(dailyLog.previousScore.health.score).toBe(500);
    expect(dailyLog.startingScore.health.score).toBe(490); // Prior-day decay applied
    expect(dailyLog.updatedScore.health.score).toBe(514); // Actions add on
    expect(dailyLog.startingScore.health.daysSince).toBe(2);
    expect(dailyLog.updatedScore.health.daysSince).toBe(0);

    expect(dailyLog.previousScore.career.score).toBe(500);
    expect(dailyLog.startingScore.career.score).toBe(495); // Had had progress; decay suppressed
    expect(dailyLog.updatedScore.career.score).toBe(495);
    expect(dailyLog.startingScore.career.daysSince).toBe(2);
    expect(dailyLog.updatedScore.career.daysSince).toBe(2);
  });
});
