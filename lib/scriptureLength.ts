import type { ScriptureEdition, ScriptureLevel } from "@/lib/prompt";
import type { ScriptureSourceGenre } from "@/lib/scriptureGenre";

export type ScriptureLengthTarget = {
  min: number;
  ideal: number;
  max: number;
  unit: "chars" | "words";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function countScriptureLength(value: string, edition: ScriptureEdition) {
  if (edition === "kjv") {
    return value.trim().split(/\s+/u).filter(Boolean).length;
  }
  return [...value.replace(/\s+/gu, "")].length;
}

export function getScriptureLengthTarget(
  source: string,
  genre: ScriptureSourceGenre,
  level: ScriptureLevel,
  edition: ScriptureEdition,
): ScriptureLengthTarget {
  const sourceChars = [...source.replace(/\s+/gu, "")].length;
  const englishScale = edition === "kjv" ? 0.72 : 1;
  let min: number;
  let ideal: number;
  let max: number;

  if (genre === "story") {
    if (level === "light") {
      min = clamp(sourceChars * 0.38, 45, 620);
      ideal = clamp(sourceChars * 0.62, 70, 820);
      max = clamp(sourceChars * 0.88, 105, 1050);
    } else if (level === "grand") {
      min = clamp(sourceChars * 1.25, 150, 2200);
      ideal = clamp(sourceChars * 1.65, 220, 3000);
      max = clamp(sourceChars * 2.2, 320, 3900);
    } else {
      min = clamp(sourceChars * 0.78, 90, 1300);
      ideal = clamp(sourceChars * 1.08, 125, 1850);
      max = clamp(sourceChars * 1.42, 180, 2500);
    }
  } else if (level === "light") {
    min = clamp(sourceChars * 0.35, 12, 120);
    ideal = clamp(sourceChars * 0.62, 20, 170);
    max = clamp(sourceChars * 0.92, 38, 240);
  } else if (level === "grand") {
    min = clamp(sourceChars * 1.25, 65, 520);
    ideal = clamp(sourceChars * 1.75, 95, 760);
    max = clamp(sourceChars * 2.5, 150, 1050);
  } else {
    min = clamp(sourceChars * 0.72, 24, 260);
    ideal = clamp(sourceChars * 1.08, 36, 390);
    max = clamp(sourceChars * 1.55, 60, 560);
  }

  return {
    min: Math.max(1, Math.round(min * englishScale)),
    ideal: Math.max(1, Math.round(ideal * englishScale)),
    max: Math.max(2, Math.round(max * englishScale)),
    unit: edition === "kjv" ? "words" : "chars",
  };
}

export function buildLengthInstruction(target: ScriptureLengthTarget, level: ScriptureLevel) {
  if (target.unit === "chars") {
    const action =
      level === "light"
        ? "压缩重复寒暄与次要说明，只保留主因、决定性发言、关键动作和结局。"
        : level === "grand"
          ? "扩展原文已有的场景、反应、复沓和评语，但不得增加新的核心事实或结局。"
          : "保留主要层次，使篇幅接近输入，只合并重复内容。";
    return `${action}目标 ${target.min}—${target.max} 个汉字，以约 ${target.ideal} 字为佳；不得机械截断结局。`;
  }
  const action =
    level === "light"
      ? "Summarize repeated courtesies and secondary explanations; retain the main cause, decisive speech, action, and ending."
      : level === "grand"
        ? "Expand the source's existing scene, reactions, parallel cadence, and commentary, but invent no new core fact or outcome."
        : "Keep the main layers and a length close to the source; merge only repetition.";
  return `${action} Target ${target.min}-${target.max} English words, ideally about ${target.ideal}. Do not mechanically truncate the ending.`;
}

export function assessScriptureLength(
  value: string,
  target: ScriptureLengthTarget,
  edition: ScriptureEdition,
) {
  const actual = countScriptureLength(value, edition);
  if (actual < target.min) {
    return {
      acceptable: false,
      actual,
      issue: `篇幅不足：当前约 ${actual}，目标至少 ${target.min}`,
    };
  }
  if (actual > target.max) {
    return {
      acceptable: false,
      actual,
      issue: `篇幅过长：当前约 ${actual}，目标至多 ${target.max}`,
    };
  }
  return { acceptable: true, actual, issue: "" };
}

export function structureTokenBudget(source: string, genre: ScriptureSourceGenre, level: ScriptureLevel) {
  const length = [...source].length;
  if (genre !== "story") return level === "grand" ? 1100 : 750;
  if (length < 180) return level === "grand" ? 1700 : 1250;
  if (length < 700) return level === "grand" ? 2600 : 1900;
  return level === "grand" ? 3200 : 2500;
}
