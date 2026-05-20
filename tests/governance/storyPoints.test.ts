import { describe, it, expect } from "vitest";
import {
  minutesToStoryPoints,
  resolveMinutesPerStoryPoint,
  DEFAULT_MINUTES_PER_STORY_POINT,
  MIN_STORY_POINTS
} from "../../src/governance/storyPoints";

describe("minutesToStoryPoints", () => {
  it("truncates to one decimal at 1 SP = 60 min", () => {
    expect(minutesToStoryPoints(10)).toBe(0.1); // 10/60 = 0.166… → 0.1
    expect(minutesToStoryPoints(22)).toBe(0.3); // 22/60 = 0.366… → 0.3
    expect(minutesToStoryPoints(90)).toBe(1.5); // 90/60 = 1.5
  });

  it("floors sub-threshold durations at MIN_STORY_POINTS", () => {
    expect(minutesToStoryPoints(0.1)).toBe(MIN_STORY_POINTS); // segundos
    expect(minutesToStoryPoints(0)).toBe(MIN_STORY_POINTS);
    expect(minutesToStoryPoints(2)).toBe(MIN_STORY_POINTS); // 2/60 = 0.03 → piso
  });

  it("truncates exact values without floating-point drift (42 min → 0.7)", () => {
    // 42/60 = 0.7 exato; um floor((42/60)*10)/10 ingênuo daria 0.6
    expect(minutesToStoryPoints(42)).toBe(0.7);
  });

  it("honors a configurable minutes-per-point rate", () => {
    expect(minutesToStoryPoints(30, 30)).toBe(1); // 1 SP = 30 min
    expect(minutesToStoryPoints(45, 30)).toBe(1.5);
  });
});

describe("resolveMinutesPerStoryPoint", () => {
  it("defaults to 60 when MINUTES_PER_STORY_POINT is unset", () => {
    expect(resolveMinutesPerStoryPoint({})).toBe(DEFAULT_MINUTES_PER_STORY_POINT);
  });
  it("reads a positive numeric override", () => {
    expect(resolveMinutesPerStoryPoint({ MINUTES_PER_STORY_POINT: "45" })).toBe(45);
  });
  it("falls back to the default on a non-numeric value", () => {
    expect(resolveMinutesPerStoryPoint({ MINUTES_PER_STORY_POINT: "garbage" })).toBe(
      DEFAULT_MINUTES_PER_STORY_POINT
    );
  });
  it('falls back to the default on "0"', () => {
    expect(resolveMinutesPerStoryPoint({ MINUTES_PER_STORY_POINT: "0" })).toBe(
      DEFAULT_MINUTES_PER_STORY_POINT
    );
  });
  it("falls back to the default on a negative value", () => {
    expect(resolveMinutesPerStoryPoint({ MINUTES_PER_STORY_POINT: "-10" })).toBe(
      DEFAULT_MINUTES_PER_STORY_POINT
    );
  });
});
