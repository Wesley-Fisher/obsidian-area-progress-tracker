import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, Scores, SystemConfig } from "../../core/types";
import { mergePreviousIntoNextDay, recomputeForwardChain, scoresEqual, seedFromPreviousDay } from "../../core/recomputeChain";
import { buildDailyLog } from "../../core/scoring";
import { createVaultRepo } from "../../core/vault/repo";
import { MemoryVault } from "../memoryVault";

function dayPath(d: IsoDate): string {
  return `ProgressTracker/logs/apt.${d}.json`;
}

describe("scoresEqual", () => {
  it("detects equal scores", async () => {
    const a: Scores = {"health": {"score": 200, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}};
    expect(scoresEqual(a, a)).toBe(true);
  });

  it("detects unequal scores - extra element", async () => {
    const a: Scores = {"health": {"score": 200, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}};
    const b: Scores = {"health": {"score": 200, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}, "another": {"score": 200, "daysSince": 0}};
    expect(scoresEqual(a, b)).toBe(false);
  });

  it("detects unequal scores - different values", async () => {
    const a: Scores = {"health": {"score": 200, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}};
    const b: Scores = {"health": {"score": 201, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}};
    expect(scoresEqual(a, b)).toBe(false);
  });

  it("detects unequal scores - different keys", async () => {
    const a: Scores = {"health": {"score": 200, "daysSince": 0}, "work": {"score": 200, "daysSince": 0}};
    const b: Scores = {"health": {"score": 200, "daysSince": 0}, "notWork": {"score": 200, "daysSince": 0}};
    expect(scoresEqual(a, b)).toBe(false);
  });
});

describe("seedFromPreviousDay", () => {
  it("seeds if previous day exists", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-14" as IsoDate;
    const d2 = "2026-03-15" as IsoDate;

    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };

    await vault.write(dayPath(d1), JSON.stringify(day1));

    const seedResult = await seedFromPreviousDay(d2, repo);
    expect(seedResult).toEqual(day1.updatedScore);
  });

  it("does not seed from a day 2 days ago", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-13" as IsoDate;
    const d2 = "2026-03-15" as IsoDate;

    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };

    await vault.write(dayPath(d1), JSON.stringify(day1));

    const seedResult = await seedFromPreviousDay(d2, repo);
    expect(seedResult).toBeUndefined();
  });

  it("does not seed from the next day", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-16" as IsoDate;
    const d2 = "2026-03-15" as IsoDate;

    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };

    await vault.write(dayPath(d1), JSON.stringify(day1));

    const seedResult = await seedFromPreviousDay(d2, repo);
    expect(seedResult).toBeUndefined();
  });
});

describe("mergePreviousIntoNextDay", () => {
  it("merges a previous day into current day", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-16" as IsoDate;
    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };
    await vault.write(dayPath(d1), JSON.stringify(day1));

    const d2 = "2026-03-15" as IsoDate;
    const day2: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "181" }),
      notes: "keep this",
    };
    await vault.write(dayPath(d2), JSON.stringify(day2));

    // day1Raw is not used in this test
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const day1Raw = await repo.readDailyLogRaw(d1);
    const day2Raw = await repo.readDailyLogRaw(d2);
    const {merged, nextLog, didChange} = await mergePreviousIntoNextDay(d2, day2Raw, config, day1.updatedScore);

    expect(merged.records?.weight).toBe("181");
    expect(didChange).toBe(true);
    expect(nextLog.updatedScore).not.toEqual(day1.updatedScore);
  });

  it("merges from a nonexistent day", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-16" as IsoDate;
    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };
    await vault.write(dayPath(d1), JSON.stringify(day1));

    const d2 = "2026-03-15" as IsoDate;
    const day2: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "181" }),
      notes: "keep this",
    };
    await vault.write(dayPath(d2), JSON.stringify(day2));
    const d2Raw = await repo.readDailyLogRaw(d2);

    // nextLog is not used in this test
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {merged, nextLog, didChange} = await mergePreviousIntoNextDay(d2, d2Raw, config, day1.updatedScore);

    expect(merged.records?.weight).toBe("181");
    expect(didChange).toBe(true);
  });
});

describe("recomputeForwardChain", () => {
  it("preserves records and extra fields while recomputing derived scores", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [{ id: "morning", name: "Morning" }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [{ id: "weight", name: "Weight", input: { type: "number" }, groupIds: ["morning"] }],
    };

    const d1 = "2026-03-14" as IsoDate;
    const d2 = "2026-03-15" as IsoDate;

    const day1: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, undefined, { walk: 1 }, { weight: "180" }),
      notes: "keep this",
    };

    const day2: DailyLog & { notes?: string } = {
      ...buildDailyLog(config, day1.updatedScore, { walk: 0 }, { weight: "179" }),
      notes: "also keep",
    };

    await vault.write(dayPath(d1), JSON.stringify(day1));
    await vault.write(dayPath(d2), JSON.stringify(day2));

    await recomputeForwardChain({
      repo,
      config,
      startDate: d1,
      earlyExit: false,
    });

    const next1 = JSON.parse(await vault.read(dayPath(d1))) as DailyLog & { notes?: string };
    const next2 = JSON.parse(await vault.read(dayPath(d2))) as DailyLog & { notes?: string };

    expect(next1.records?.weight).toBe("180");
    expect(next1.notes).toBe("keep this");

    expect(next2.records?.weight).toBe("179");
    expect(next2.notes).toBe("also keep");
  });

  it("clamps per-day action totals to action.max", async () => {
    const vault = new MemoryVault();
    const repo = createVaultRepo(vault, "ProgressTracker");

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, max: 2, groupIds: [] },
      ],
      records: [],
    };

    const d1 = "2026-03-14" as IsoDate;

    const day1: DailyLog = {
      ...buildDailyLog(config, undefined, { walk: 10 }, {}),
      actions: { walk: 10 },
    };

    await vault.write(dayPath(d1), JSON.stringify(day1));

    await recomputeForwardChain({
      repo,
      config,
      startDate: d1,
      earlyExit: false,
    });

    const next1 = JSON.parse(await vault.read(dayPath(d1))) as DailyLog;
    expect(next1.actions.walk).toBe(2);
  });
});
