import type { NormalizedEmploymentType, NormalizedRemoteType } from "../base/types";

export function inferExperienceLevel(title: string, description = ""): string | undefined {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(intern|internship|co-?op|student)\b/.test(text)) return "INTERNSHIP";
  if (/\b(principal|staff|director|head of|lead)\b/.test(text)) return "LEAD";
  if (/\b(senior|sr\.?)\b/.test(text)) return "SENIOR";
  if (/\b(mid-level|mid level|intermediate)\b/.test(text)) return "MID";
  if (/\b(junior|entry[- ]level|new grad|graduate|jr\.?)\b/.test(text)) return "ENTRY";
  return undefined;
}

export function inferEmploymentType(title: string, explicit?: string): NormalizedEmploymentType {
  const text = `${explicit ?? ""} ${title}`.toLowerCase();
  if (text.includes("intern")) return "INTERNSHIP";
  if (text.includes("contract") || text.includes("freelance")) return "CONTRACT";
  if (text.includes("part-time") || text.includes("part time")) return "PART_TIME";
  if (text.includes("temp")) return "TEMPORARY";
  if (text.includes("full-time") || text.includes("full time") || text.includes("permanent")) return "FULL_TIME";
  return "UNKNOWN";
}

export function inferRemoteType(location: string, title = ""): NormalizedRemoteType {
  const text = `${location} ${title}`.toLowerCase();
  if (text.includes("remote") || text.includes("worldwide") || text.includes("anywhere")) return "REMOTE";
  if (text.includes("hybrid")) return "HYBRID";
  return location.trim() ? "ONSITE" : "UNKNOWN";
}
