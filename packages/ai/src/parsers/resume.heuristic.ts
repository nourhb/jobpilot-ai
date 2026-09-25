import type { ResumeExtraction, WorkAuthorizationStatus } from "@jobpilot/shared";

/**
 * Deterministic, offline, regex/keyword-based resume extraction used by
 * MockAIProvider (keep_mock) and as a fallback if a real provider fails.
 *
 * It only keeps what is written on the page. It never invents an
 * employer, school, date, or legal status. Dates and job headers are
 * matched where they actually appear on real CVs (same line as the
 * title, stacked company/title, pipes, PDF-flattened text).
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]*)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4})/;
const LINKEDIN_RE = /(https?:\/\/)?(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/]+/i;
const GITHUB_RE = /(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9\-_/]+/i;
const PORTFOLIO_RE =
  /(?:https?:\/\/)?(?:www\.)(?!(?:linkedin|github)\.com)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/i;
const YEARS_RE =
  /\b(?:over|more than)?\s*(\d{1,2})\+?\s+years?(?:\s+of)?(?:\s+professional)?\s+experience\b/i;

const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

const MONTH_TOKEN = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const YEAR = "(?:19|20)\\d{2}";
const END_YEAR = `${YEAR}|present|current|now|today|aujourd['’]hui`;
const MONTH_YEAR = `(?:(?:${MONTH_TOKEN})\\.?\\s+)?(?:${YEAR}|'?\\d{2}(?!\\d))`;

const DATE_RANGE_SOURCE = `(?:${MONTH_YEAR}|\\d{1,2}\\/${YEAR})\\s*(?:[-–—−]|to|à)\\s*(?:${MONTH_YEAR}|\\d{1,2}\\/${YEAR}|present|current|now|today|aujourd['’]hui)`;
const DATE_RANGE_RE = new RegExp(DATE_RANGE_SOURCE, "i");
const DATE_RANGE_GLOBAL_RE = new RegExp(DATE_RANGE_SOURCE, "gi");

const SECTION_ALIASES: Array<[RegExp, string]> = [
  [/^(?:professional\s+)?summary|profile|objective|about(?:\s+me)?|profil|sommaire|résumé\s+professionnel$/i, "summary"],
  [/^(?:technical\s+)?skills|competenc(?:e|y|ies)|core\s+competenc|technologies|tech\s+stack|outils|compétences$/i, "skills"],
  [/^(?:work\s+|professional\s+|relevant\s+)?experience|employment(?:\s+history)?|work\s+history|career(?:\s+history)?|expérience(?:\s+professionnelle)?$/i, "experience"],
  [/^education|academic\s+background|formation|études|education\s+and\s+training$/i, "education"],
  [/^certifications?|licen[cs]es?|credentials|certificats?$/i, "certifications"],
  [/^projects?|selected\s+projects|projets?$/i, "projects"],
  [/^(?:work\s+)?authorization|eligibility|immigration|work\s+status|statut$/i, "authorization"],
  [/^languages?|langues?$/i, "languages"],
  [/^community(?:\s+involvement)?|volunteering|activities$/i, "community"],
];

const SECTION_HEADER_RE =
  /^(summary|professional summary|profile|objective|about(?: me)?|skills|technical skills|competenc(?:e|y|ies)|core competencies|technologies|tech stack|experience|work experience|professional experience|relevant experience|employment(?: history)?|work history|career(?: history)?|education|academic background|formation|certifications?|licen[cs]es?|projects?|selected projects|work authorization|eligibility|languages?|community(?: involvement)?|volunteering|activities|profil|sommaire|compétences|expérience(?: professionnelle)?|études|certificats?|projets?|langues?|statut)\s*:?\s*$/i;

const INLINE_SECTION_RE =
  /^(.*?)((?:professional\s+|work\s+|technical\s+)?(?:summary|education|skills|certifications?|projects?|languages?)|(?:work\s+|professional\s+|relevant\s+)experience|(?<!\bof\s)experience)\s*[-:]?\s*(.+)$/i;

const JOB_TITLE_RE =
  /\b(engineer|developer|programmer|manager|analyst|intern(?:ship)?|consultant|director|lead|specialist|architect|designer|coordinator|officer|associate|scientist|administrator|assistant|agent|technician|founder|owner|president|principal|staff|researcher|professor|teacher|accountant|recruiter|writer|editor|marketer|support|tester|devops|sre|sysadmin|scrum master|product owner|data scientist|software|full[-\s]?stack|front[-\s]?end|back[-\s]?end|cloud|security|network|qa|cto|ceo|cfo|vp|head of|co-?founder|graphic)\b/i;

const LOCATION_COUNTRY_RE =
  /\b(tunisia|canada|united kingdom|uk|england|france|germany|united states|usa|morocco|algeria|india|remote|hybrid)\b/i;

const NOISE_LINE_RE =
  /^(key\s+(results|tasks|outcomes|observations)|community involvement|microsoft club|ila club|--\s*\d+\s+of\s+\d+\s+--|\d+\s*\/\s*\d+)$/i;

const ROLE_SUFFIX_RE = /\s*[-–—]\s*(internship|intern|co-?op|stage)\s*$/i;

const COMPANY_HINT_RE =
  /\b(inc\.?|ltd\.?|llc|l\.?l\.?c\.?|corp\.?|limited|technologies|solutions|systems|group|studios|labs|partners|holdings|company|co\.|gmbh|plc|inc)\b/i;

const SCHOOL_RE = /\b(university|université|college|collège|institute|institut|school|école|polytechnic|polytechnique|academy)\b/i;

const DEGREE_RE =
  /\b(b\.?\s*(a|sc|eng|tech|comm|ed)\.?|bachelor(?:['’]?s)?|baccalaureate|m\.?\s*(a|sc|eng|ba|ed)\.?|master(?:['’]?s)?|mba|ph\.?d\.?|doctorate|engineer(?:['’]?s)?(?:\s+degree)?|diploma|d\.?e\.?c\.?|certificate|associate|high school|secondary|licence|maîtrise|doctorat)\b/i;

const KNOWN_SKILLS = [
  "Docker",
  "Kubernetes",
  "Azure",
  "AWS",
  "GCP",
  "Google Cloud",
  "React",
  "React Native",
  "Next.js",
  "Node.js",
  "Express",
  "NestJS",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "SQL",
  "Redis",
  "Linux",
  "Git",
  "CI/CD",
  "Jenkins",
  "GitHub Actions",
  "GitLab",
  "Terraform",
  "Ansible",
  "Python",
  "TypeScript",
  "JavaScript",
  "Java",
  "C#",
  ".NET",
  "Go",
  "Golang",
  "Rust",
  "C++",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Bash",
  "PowerShell",
  "Prometheus",
  "Grafana",
  "Helm",
  "Nginx",
  "GraphQL",
  "REST",
  "Kafka",
  "RabbitMQ",
  "Elasticsearch",
  "Snowflake",
  "Databricks",
  "Spark",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "HTML",
  "CSS",
  "Sass",
  "Tailwind",
  "Vue",
  "Angular",
  "Svelte",
  "Django",
  "Flask",
  "FastAPI",
  "Spring",
  "Jira",
  "Confluence",
  "Figma",
  "Agile",
  "Scrum",
  "Kanban",
  "Microservices",
  "OpenShift",
  "Pulumi",
  "CloudFormation",
  "S3",
  "EC2",
  "Lambda",
  "DynamoDB",
  "Prisma",
  "Webpack",
  "Vite",
  "PowerBI",
  "VMware",
  "OpenStack",
  "Proxmox",
  "WordPress",
  "Shopify",
  "PLSQL",
  "IAM",
  "RDS",
  "VPC",
];

const AUTH_PHRASES: Array<[RegExp, WorkAuthorizationStatus]> = [
  [/\bcanadian\s+citizen(?:ship)?\b|\bcitizenship\s*[:\-]\s*canadian\b|\bcitoyen(?:ne)?\s+canadien(?:ne)?\b|\bcitoyenneté\s+canadienne\b/i, "CANADIAN_CITIZEN"],
  [/\bpermanent\s+residenc(?:y|t)\b|\bpr\s+(?:status|holder|card)\b|\brésident(?:e)?\s+permanent(?:e)?\b/i, "PERMANENT_RESIDENT"],
  [/\bopen\s+work\s+permit\b|\bpgwp\b|\bpost[-\s]?graduate\s+work\s+permit\b|\bpermis\s+de\s+travail\s+ouvert\b/i, "OPEN_WORK_PERMIT"],
  [/\b(?:closed|employer[-\s]specific)\s+work\s+permit\b|\bLMIA\b|\bpermis\s+de\s+travail\s+fermé\b/i, "CLOSED_WORK_PERMIT"],
  [/\b(?:study|student)\s+permit\b|\bstudent\s+visa\b|\bpermis\s+d['’]études\b/i, "STUDENT_PERMIT"],
  [/\brequires?\s+(?:visa\s+)?sponsorship\b|\bneeds?\s+sponsorship\b|\bsponsorship\s+required\b/i, "REQUIRES_SPONSORSHIP"],
];

const CANADIAN_PROVINCES: Record<string, string> = {
  ontario: "ON",
  on: "ON",
  quebec: "QC",
  québec: "QC",
  qc: "QC",
  "british columbia": "BC",
  bc: "BC",
  alberta: "AB",
  ab: "AB",
  manitoba: "MB",
  mb: "MB",
  saskatchewan: "SK",
  sk: "SK",
  "nova scotia": "NS",
  ns: "NS",
  "new brunswick": "NB",
  nb: "NB",
  newfoundland: "NL",
  "newfoundland and labrador": "NL",
  nl: "NL",
  "prince edward island": "PE",
  pe: "PE",
  pei: "PE",
  yukon: "YT",
  yt: "YT",
  "northwest territories": "NT",
  nt: "NT",
  nunavut: "NU",
  nu: "NU",
};

const US_STATES: Record<string, string> = {
  al: "AL",
  ak: "AK",
  az: "AZ",
  ar: "AR",
  ca: "CA",
  co: "CO",
  ct: "CT",
  de: "DE",
  fl: "FL",
  ga: "GA",
  hi: "HI",
  id: "ID",
  il: "IL",
  in: "IN",
  ia: "IA",
  ks: "KS",
  ky: "KY",
  la: "LA",
  me: "ME",
  md: "MD",
  ma: "MA",
  mi: "MI",
  mn: "MN",
  ms: "MS",
  mo: "MO",
  mt: "MT",
  ne: "NE",
  nv: "NV",
  nh: "NH",
  nj: "NJ",
  nm: "NM",
  ny: "NY",
  nc: "NC",
  nd: "ND",
  oh: "OH",
  ok: "OK",
  or: "OR",
  pa: "PA",
  ri: "RI",
  sc: "SC",
  sd: "SD",
  tn: "TN",
  tx: "TX",
  ut: "UT",
  vt: "VT",
  va: "VA",
  wa: "WA",
  wv: "WV",
  wi: "WI",
  wy: "WY",
  dc: "DC",
};

function findFirst(re: RegExp, text: string): string | undefined {
  const match = re.exec(text);
  return match ? match[0] : undefined;
}

const MONTH_NAME_RE = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";

function ungluePdfText(text: string): string {
  let value = text;
  for (let i = 0; i < 4; i += 1) {
    const next = value.replace(/([A-Za-z])\n\s*[´''`ˆ^~΅̀̂̃̈]\s*\n\s*([A-Za-z])/g, "$1$2");
    if (next === value) break;
    value = next;
  }

  return value
    .replace(new RegExp(`([A-Za-z)])(?=(?:${MONTH_NAME_RE})\\b)`, "g"), "$1 ")
    .replace(/([a-z])(?=(?:19|20)\d{2}\b)/g, "$1 ")
    .replace(/:(?=[A-Za-z])/g, ": ")
    .replace(/\b(Summary|Experience|Education|Skills|Projects|Certifications|Languages)(?=-)/gi, "$1 ")
    .replace(/\b(Developer|Assistant|Agent|Editor|Engineer|Intern|Manager|Analyst|Consultant)(?=[A-Z])/g, "$1 ");
}

export function normalizeResumeText(text: string): string {
  let normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u000c/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[–—−‒]/g, "-")
    .replace(/[•●▪▸►‣∙○◦]/g, "\n• ")
    .replace(/[\u0080-\u009F]/g, " ")
    .replace(/^\s*(?:--\s*)?\d+\s*(?:\/|of)\s*\d+\s*(?:--)?\s*$/gim, "")
    .replace(/\t+/g, " | ");

  normalized = ungluePdfText(normalized);

  const structuredLines = normalized.split("\n").filter((line) => line.trim()).length;
  if (structuredLines < 8 && normalized.length > 200) {
    normalized = normalized
      .replace(/ {2,}/g, "\n")
      .replace(new RegExp(`\\s+(?=(?:${MONTH_TOKEN})\\.?\\s+(?:${YEAR}))`, "gi"), "\n")
      .replace(new RegExp(`\\s+(?=(?:${YEAR})\\s*-\\s*(?:(?:${YEAR})|present|current))`, "gi"), "\n");
  }

  normalized = normalized.replace(
    /(?<=\S)\s+(?=(?:professional\s+|work\s+|technical\s+|relevant\s+)?(?:summary|profile|objective|education|skills|certifications?|projects?|languages?|employment|compétences|expérience|formation|études)\b)/gi,
    "\n",
  );
  normalized = normalized.replace(
    /(?<=\S)\s+(?=(?:work\s+|professional\s+|relevant\s+)experience\b|(?<!\bof\s)(?<!years\s)Experience\b)/g,
    "\n",
  );

  return normalized
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function monthToNumber(raw: string | undefined): string {
  if (!raw) return "01";
  const key = raw.replace(/\./g, "").toLowerCase();
  return MONTHS[key] ?? "01";
}

function expandTwoDigitYear(token: string): string {
  if (/^(?:19|20)\d{2}$/.test(token)) return token;
  const two = token.replace("'", "");
  const n = Number(two);
  if (!Number.isFinite(n) || two.length > 2) return token;
  return n >= 50 ? `19${two.padStart(2, "0")}` : `20${two.padStart(2, "0")}`;
}

function toIsoDate(month: string | undefined, year: string): string {
  return `${expandTwoDigitYear(year)}-${monthToNumber(month)}-01`;
}

export function findDateRange(
  line: string,
): { startDate: string; endDate?: string; isCurrent: boolean; raw: string } | null {
  const match = DATE_RANGE_RE.exec(line);
  if (!match) return null;

  const raw = match[0];
  const parts = raw.split(/\s*(?:[-–—−]|to|à)\s*/i);
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;

  const parseSide = (side: string): { month?: string; year: string; present: boolean } | null => {
    if (/present|current|now|today|aujourd/i.test(side)) {
      return { year: String(new Date().getFullYear()), present: true };
    }
    const monthYear = side.match(new RegExp(`(?:(${MONTH_TOKEN})\\.?)\\s+(${YEAR}|'?\\d{2}(?!\\d))`, "i"));
    if (monthYear?.[2]) {
      return { month: monthYear[1], year: monthYear[2], present: false };
    }
    const slash = side.match(new RegExp(`(\\d{1,2})\\/(${YEAR})`));
    if (slash?.[1] && slash[2]) {
      return { month: slash[1].padStart(2, "0"), year: slash[2], present: false };
    }
    const yearOnly = side.match(new RegExp(`(${YEAR})`));
    if (yearOnly?.[1]) return { year: yearOnly[1], present: false };
    return null;
  };

  const start = parseSide(parts[0]);
  const end = parseSide(parts[1]);
  if (!start) return null;

  const isCurrent = Boolean(end?.present);
  return {
    startDate: toIsoDate(start.month, start.year),
    endDate: isCurrent || !end ? undefined : toIsoDate(end.month, end.year),
    isCurrent,
    raw,
  };
}

function stripDateRange(line: string): string {
  return line
    .replace(DATE_RANGE_GLOBAL_RE, " ")
    .replace(/[|()[\]]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeJobTitle(value: string): boolean {
  return JOB_TITLE_RE.test(value) && value.length <= 80;
}

function looksLikeCompany(value: string): boolean {
  return COMPANY_HINT_RE.test(value) && value.length <= 80;
}

function looksLikeDegree(value: string): boolean {
  return DEGREE_RE.test(value);
}

function looksLikeSchool(value: string): boolean {
  return SCHOOL_RE.test(value);
}

function looksLikeLocation(value: string): boolean {
  return (
    /,\s*[A-Z]{2}\b/.test(value) ||
    LOCATION_COUNTRY_RE.test(value) ||
    /^(remote|hybrid|on-?site)$/i.test(value)
  );
}

function looksLikeNoise(value: string): boolean {
  return NOISE_LINE_RE.test(value.trim());
}

function stripRoleSuffix(value: string): string {
  return value.replace(ROLE_SUFFIX_RE, "").trim();
}

function splitTitleAndLocation(line: string): { text: string; location?: string } {
  const trimmed = line.trim();
  if (!trimmed) return { text: "" };
  if (/^(remote|hybrid|on-?site)$/i.test(trimmed)) return { text: "", location: trimmed };

  const afterTitle = trimmed.match(
    /^(.*?\b(?:developer|assistant|agent|editor|engineer|intern|manager|analyst|consultant))\s+(.+)$/i,
  );
  if (afterTitle?.[1] && afterTitle[2] && LOCATION_COUNTRY_RE.test(afterTitle[2])) {
    return { text: afterTitle[1].trim(), location: afterTitle[2].trim() };
  }

  const locMatch = trimmed.match(/^(.*)\s+([A-Z][\w.'-]+(?:,\s*[A-Za-z][\w.' -]+)+)$/);
  if (locMatch?.[1] && locMatch[2] && LOCATION_COUNTRY_RE.test(locMatch[2]) && locMatch[1].trim().length >= 3) {
    return { text: locMatch[1].trim(), location: locMatch[2].trim() };
  }

  const countryOnly = trimmed.match(/^(.*)\s+(Tunisia|Canada|France|Germany|India|England|Remote)$/i);
  if (countryOnly?.[1] && countryOnly[2] && countryOnly[1].trim().length >= 3) {
    return { text: countryOnly[1].trim(), location: countryOnly[2] };
  }

  return { text: trimmed };
}

function looksLikeBullet(value: string): boolean {
  return /^[•\-*◦▪▸]/.test(value) || /^(developed|built|led|managed|designed|implemented|created|improved|owned|responsible|collaborated|worked|maintained|deployed|automated|migrated)\b/i.test(value);
}

function parseTitleCompany(line: string): { jobTitle: string; company: string; location?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 160 || (findDateRange(trimmed) && stripDateRange(trimmed).length === 0)) {
    return null;
  }

  const cleaned = stripDateRange(trimmed);
  if (!cleaned || cleaned.length > 140) return null;

  const at = cleaned.split(/\s+(?:at|@)\s+/i);
  if (at.length === 2 && at[0] && at[1] && at[0].length < 80 && at[1].length < 80) {
    return { jobTitle: at[0].trim(), company: at[1].trim() };
  }

  const parts = cleaned
    .split(/\s*[|·,]\s*|\s+[-–—]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 80 && !looksLikeLocation(part));

  if (parts.length >= 2 && parts[0] && parts[1]) {
    const locationPart = cleaned
      .split(/\s*[|·]\s*/)
      .map((part) => part.trim())
      .find((part) => looksLikeLocation(part));
    if (looksLikeJobTitle(parts[0]) || looksLikeCompany(parts[1])) {
      return { jobTitle: parts[0], company: parts[1], location: locationPart };
    }
    if (looksLikeCompany(parts[0]) || looksLikeJobTitle(parts[1])) {
      return { jobTitle: parts[1], company: parts[0], location: locationPart };
    }
    return { jobTitle: parts[0], company: parts[1], location: locationPart };
  }

  return splitImpliedTitleCompany(cleaned);
}

function splitImpliedTitleCompany(line: string): { jobTitle: string; company: string } | null {
  const match = line.match(
    /^((?:[A-Za-z/+#&-]+\s+)*?(?:engineer|developer|programmer|manager|analyst|intern|consultant|director|lead|specialist|architect|designer|coordinator|officer|associate|scientist|administrator|technician|founder|researcher|devops|sre))\s+([A-Z][A-Za-z0-9&.+'][A-Za-z0-9&.+' -]{0,40})$/i,
  );
  if (!match?.[1] || !match[2]) return null;
  const company = match[2].trim();
  if (company.split(/\s+/).length > 5) return null;
  if (looksLikeBullet(company) || looksLikeDegree(company) || looksLikeLocation(company)) return null;
  return { jobTitle: match[1].trim(), company };
}

function splitHeaderAndDescription(line: string): { header: string; description?: string } {
  const match = line.match(
    /\s+\b(developed|built|led|managed|designed|implemented|created|improved|owned|responsible|collaborated|worked|maintained|deployed|automated|migrated)\b/i,
  );
  if (match?.index && match.index > 8) {
    return { header: line.slice(0, match.index).trim(), description: line.slice(match.index).trim() };
  }
  return { header: line };
}

function extractSkills(text: string, skillsSection: string): ResumeExtraction["skills"] {
  const found = new Map<string, string>();

  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?<![\\w.+#])${escaped}(?![\\w.+#])`, "i");
    if (re.test(text)) found.set(skill.toLowerCase(), skill);
  }

  if (skillsSection) {
    for (const token of skillsSection.split(/[,;|•\n]/)) {
      const name = token
        .replace(/^[-–—*]\s*/, "")
        .replace(/^[^:]{2,40}:\s*/, "")
        .trim();
      if (name.length < 2 || name.length > 40) continue;
      if (/\d{4}|@|http|years? of/i.test(name)) continue;
      if (name.split(/\s+/).length > 4) continue;
      if (SECTION_HEADER_RE.test(name)) continue;
      if (/^(programming|languages?|frameworks?|tools?|cloud|virtualization|devops|automation|project|management|migration)$/i.test(name)) continue;
      const key = name.toLowerCase();
      if (!found.has(key)) found.set(key, name);
    }
  }

  return Array.from(found.values()).map((name) => ({ name }));
}

function extractProbableName(text: string): { firstName?: string; lastName?: string } {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.split("|")[0]?.trim() ?? "")
    .find((line) => line.length > 0 && !EMAIL_RE.test(line) && !PHONE_RE.test(line) && !/^https?:/i.test(line));

  if (!firstLine) return {};

  const words = firstLine.split(/\s+/).filter(Boolean);
  const looksLikeName =
    words.length >= 2 &&
    words.length <= 5 &&
    words.every((w) => /^[A-Za-z][a-zA-Z'.-]*$/.test(w)) &&
    !/@|resume|curriculum|cv\b|engineer|developer/i.test(firstLine);

  if (!looksLikeName) return {};

  return {
    firstName: titleCaseWord(words[0] ?? ""),
    lastName: titleCaseWord(words[words.length - 1] ?? ""),
  };
}

function titleCaseWord(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function classifyHeader(raw: string): string | undefined {
  const key = raw.toLowerCase().replace(/:$/, "").trim();
  for (const [pattern, name] of SECTION_ALIASES) {
    if (pattern.test(key)) return name;
  }
  return undefined;
}

function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string[]> = { preamble: [] };
  let current = "preamble";

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const exact = SECTION_HEADER_RE.exec(trimmed);
    if (exact?.[1]) {
      current = classifyHeader(exact[1]) ?? normalizeLooseHeader(exact[1]);
      sections[current] ??= [];
      continue;
    }

    const mid = trimmed.match(INLINE_SECTION_RE);
    if (mid?.[2] && (mid[1]?.trim().length ?? 0) < 40) {
      if (mid[1]?.trim()) {
        const bucket = sections[current] ?? [];
        sections[current] = bucket;
        bucket.push(mid[1].trim());
      }
      current = classifyHeader(mid[2]) ?? normalizeLooseHeader(mid[2]);
      sections[current] ??= [];
      if (mid[3]?.trim()) sections[current].push(mid[3].trim());
      continue;
    }

    const bucket = sections[current] ?? [];
    sections[current] = bucket;
    bucket.push(line);
  }

  return Object.fromEntries(Object.entries(sections).map(([key, lines]) => [key, lines.join("\n").trim()]));
}

function normalizeLooseHeader(raw: string): string {
  return classifyHeader(raw) ?? raw.toLowerCase();
}

function extractExperience(section: string): ResumeExtraction["experience"] {
  if (!section) return [];

  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  type Draft = {
    company?: string;
    jobTitle?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    description: string[];
  };

  const drafts: Draft[] = [];
  let current: Draft = { description: [] };

  const flush = () => {
    if (current.jobTitle && !current.company && /\bfreelance\b/i.test(current.jobTitle)) {
      current.company = "Freelance";
    }
    if (current.jobTitle && current.company && current.startDate) {
      drafts.push(current);
    }
    current = { description: [] };
  };

  const applyTitle = (parsed: { jobTitle: string; company: string; location?: string }) => {
    current.jobTitle = parsed.jobTitle;
    current.company = parsed.company;
    if (parsed.location) current.location = parsed.location;
  };

  for (const line of lines) {
    if (looksLikeNoise(line) || looksLikeBullet(line) && !findDateRange(line)) {
      if (looksLikeBullet(line) && current.startDate) current.description.push(line.replace(/^[-–—*]\s*/, ""));
      continue;
    }

    const dates = findDateRange(line);
    const rawLeftover = stripRoleSuffix(dates ? stripDateRange(line) : line);
    const { header, description: inlineDescription } = splitHeaderAndDescription(rawLeftover);
    const { text: leftover, location } = splitTitleAndLocation(header);
    const titleCompany = leftover && !looksLikeBullet(leftover) ? parseTitleCompany(leftover) : null;
    const isNewJob =
      Boolean(dates && current.startDate) ||
      Boolean(titleCompany && current.startDate && current.jobTitle && current.company);

    if (isNewJob && (current.jobTitle || current.company) && current.startDate) {
      flush();
    }

    if (dates) {
      current.startDate = dates.startDate;
      current.endDate = dates.endDate;
      current.isCurrent = dates.isCurrent;
    }
    if (location && !current.location) current.location = location;
    if (titleCompany) {
      applyTitle(titleCompany);
    } else if (leftover && looksLikeLocation(leftover) && !current.location) {
      current.location = leftover;
    } else if (leftover && looksLikeJobTitle(leftover) && leftover.length < 90) {
      if (!current.jobTitle) current.jobTitle = leftover;
      else if (!current.company && !looksLikeBullet(leftover)) current.company = leftover;
    } else if (
      leftover &&
      leftover.length < 80 &&
      !looksLikeBullet(leftover) &&
      !looksLikeDegree(leftover) &&
      !EMAIL_RE.test(leftover)
    ) {
      if (!current.company) current.company = leftover;
      else if (!current.jobTitle) current.jobTitle = leftover;
      else current.description.push(leftover);
    } else if (leftover) {
      current.description.push(leftover);
    }
    if (inlineDescription) current.description.push(inlineDescription);
  }
  flush();

  if (drafts.length === 0) {
    return extractExperienceFromLooseBlocks(section);
  }

  return drafts.map((draft) => ({
    company: draft.company ?? "",
    jobTitle: draft.jobTitle ?? "",
    location: draft.location,
    startDate: draft.startDate,
    endDate: draft.endDate,
    isCurrent: draft.isCurrent ?? false,
    description: draft.description.join(" ").trim() || undefined,
  }));
}

function extractExperienceFromLooseBlocks(section: string): ResumeExtraction["experience"] {
  const blocks = section.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const results: ResumeExtraction["experience"] = [];

  for (const block of blocks) {
    const dates = findDateRange(block);
    const titleCompany = parseTitleCompany(stripDateRange(block.split("\n")[0] ?? block));
    if (!dates || !titleCompany) continue;
    results.push({
      company: titleCompany.company,
      jobTitle: titleCompany.jobTitle,
      location: titleCompany.location,
      startDate: dates.startDate,
      endDate: dates.endDate,
      isCurrent: dates.isCurrent,
      description: stripDateRange(block.replace(titleCompany.jobTitle, "").replace(titleCompany.company, ""))
        .replace(/\s{2,}/g, " ")
        .trim() || undefined,
    });
  }

  return results;
}

function extractEducation(section: string): ResumeExtraction["education"] {
  if (!section) return [];

  const lines = section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  type Draft = {
    institution?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  };

  const results: ResumeExtraction["education"] = [];
  let current: Draft = {};

  const flush = () => {
    if (current.institution && current.degree) {
      results.push({
        institution: current.institution,
        degree: current.degree,
        field: current.field,
        startDate: current.startDate,
        endDate: current.endDate,
      });
    } else if (current.institution && current.field) {
      results.push({
        institution: current.institution,
        degree: current.field,
        field: current.field,
        startDate: current.startDate,
        endDate: current.endDate,
      });
    }
    current = {};
  };

  for (const line of lines) {
    if (looksLikeNoise(line)) continue;
    const dates = findDateRange(line);
    const leftover = dates ? stripDateRange(line) : line;

    if (
      leftover &&
      looksLikeSchool(leftover) &&
      current.institution &&
      (current.degree || current.field)
    ) {
      flush();
    } else if (dates && current.institution && (current.degree || current.field) && current.startDate) {
      flush();
    }
    if (dates) {
      current.startDate = dates.startDate;
      current.endDate = dates.endDate;
    }

    if (!leftover) continue;

    if (leftover.includes(",") || leftover.includes("|") || leftover.includes("-")) {
      const pieces = leftover.split(/\s*[,|]\s*|\s+[-–—]\s+/).map((part) => part.trim()).filter(Boolean);
      for (const piece of pieces) {
        assignEducationPiece(current, piece);
      }
      continue;
    }

    assignEducationPiece(current, leftover);
  }
  flush();

  return results;
}

function assignEducationPiece(current: { institution?: string; degree?: string; field?: string }, piece: string) {
  const fieldMatch = piece.match(/\b(?:in|of)\s+([A-Za-z][A-Za-z &/]{2,40})$/i);
  if (!current.institution && looksLikeSchool(piece)) {
    current.institution = piece;
    return;
  }
  if (!current.degree && looksLikeDegree(piece)) {
    current.degree = piece;
    if (fieldMatch?.[1] && !current.field) current.field = fieldMatch[1].trim();
    return;
  }
  if (!current.field && fieldMatch?.[1]) {
    current.field = fieldMatch[1].trim();
    return;
  }
  if (current.degree && !current.field && piece.length > 4 && !looksLikeSchool(piece) && !looksLikeDegree(piece)) {
    current.field = piece;
    return;
  }
  if (!current.institution && /^[A-Z][\w&.+' -]{3,80}$/.test(piece) && !looksLikeDegree(piece)) {
    current.institution = piece;
  }
}

function extractCertifications(section: string, fullText: string): ResumeExtraction["certifications"] {
  const fromSection = section
    .split(/\r?\n/)
    .map((line) => stripDateRange(line).trim())
    .filter((line) => line.length > 2 && line.length < 160 && !SECTION_HEADER_RE.test(line) && !looksLikeNoise(line))
    .map((name) => ({ name: name.replace(/^[-–—*]\s*/, "").replace(/\s*[-–—]\s*(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}$/i, "").trim() }))
    .filter((item) => item.name.length > 2);

  const known: ResumeExtraction["certifications"] = [];
  const knownPatterns = [
    /AWS Certified [A-Za-z0-9 ]{3,40}/gi,
    /Microsoft Certified[:\s][A-Za-z0-9 ]{3,40}/gi,
    /Google Cloud [A-Za-z0-9 ]{3,40}/gi,
    /\b(?:CKA|CKAD|CKS|PMP|CSM|PSM|CCNA|CCNP|Terraform Associate|CompTIA [A-Za-z+]+)\b/gi,
  ];
  for (const pattern of knownPatterns) {
    const matches = fullText.match(pattern) ?? [];
    for (const name of matches) known.push({ name: name.trim() });
  }

  const merged = new Map<string, { name: string }>();
  for (const cert of [...fromSection, ...known]) {
    merged.set(cert.name.toLowerCase(), cert);
  }
  return Array.from(merged.values());
}

const KNOWN_LANGUAGES =
  /^(arabic|french|english|spanish|german|italian|portuguese|mandarin|chinese|hindi|russian|japanese|korean|dutch|turkish|berber|tamazight)$/i;

function extractLanguages(section: string): string[] {
  if (!section) return [];
  const lines = section.split(/\r?\n/).filter((line) => line.trim().length < 60 && (line.match(/,/g) ?? []).length < 8);
  const tokens = lines
    .join("\n")
    .split(/[,;|/•\n]/)
    .map((token) => token.replace(/\([^)]*\)/g, "").replace(/^[-–—*]\s*/, "").replace(/:\s*(native|advanced|professional|fluent|intermediate|beginner).*$/i, "").trim())
    .filter((token) => token.length >= 2 && token.length <= 24 && !/\d/.test(token) && !SECTION_HEADER_RE.test(token));
  const known = tokens.filter((token) => KNOWN_LANGUAGES.test(token));
  return known.length > 0 ? known : tokens.filter((token) => !looksLikeJobTitle(token));
}

function extractAuthorization(text: string): WorkAuthorizationStatus | undefined {
  for (const [pattern, status] of AUTH_PHRASES) {
    if (pattern.test(text)) return status;
  }
  return undefined;
}

function extractYears(text: string): number | undefined {
  const match = YEARS_RE.exec(text);
  if (!match?.[1]) return undefined;
  const years = Number(match[1]);
  return Number.isFinite(years) && years >= 0 && years <= 60 ? years : undefined;
}

function inferYearsFromExperience(experience: ResumeExtraction["experience"]): number | undefined {
  const dated = experience.filter((job) => job.startDate);
  if (dated.length === 0) return undefined;

  const starts = dated.map((job) => new Date(job.startDate ?? "").getTime()).filter((n) => !Number.isNaN(n));
  const ends = dated.map((job) => {
    if (job.isCurrent || !job.endDate) return Date.now();
    const end = new Date(job.endDate).getTime();
    return Number.isNaN(end) ? Date.now() : end;
  });
  if (starts.length === 0) return undefined;

  const years = Math.round((Math.max(...ends) - Math.min(...starts)) / (365.25 * 24 * 60 * 60 * 1000));
  return years >= 0 && years <= 60 ? years : undefined;
}

function extractSummary(preamble: string, summarySection: string): string | undefined {
  if (summarySection) {
    const first = summarySection
      .split(/\n\s*\n/)
      .map((block) => block.replace(/\s+/g, " ").trim())
      .find((block) => block.length > 20);
    if (first) return first.replace(/^(?:https?:\/\/|www\.)\S+\s*/i, "").slice(0, 800);
  }

  const paragraphs = preamble
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 40 && !EMAIL_RE.test(block) && !PHONE_RE.test(block) && !looksLikeJobTitle(block.split(".")[0] ?? ""));

  return paragraphs[0]?.slice(0, 800);
}

function headerText(text: string): string {
  return text.split(/\r?\n/).slice(0, 12).join("\n");
}

function extractLocation(text: string): { city?: string; province?: string; country?: string } {
  const canadian = text.match(
    /\b([A-Z][A-Za-z. -]{1,40}),\s*(Ontario|Quebec|Québec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland(?: and Labrador)?|Prince Edward Island|Yukon|Northwest Territories|Nunavut|ON|QC|BC|AB|MB|SK|NS|NB|NL|PE|YT|NT|NU)(?:,\s*(Canada))?\b/,
  );
  if (canadian) {
    const provinceRaw = canadian[2]?.toLowerCase() ?? "";
    return {
      city: canadian[1]?.trim(),
      province: CANADIAN_PROVINCES[provinceRaw] ?? canadian[2],
      country: canadian[3] ?? "Canada",
    };
  }

  const us = text.match(/\b([A-Z][A-Za-z. -]{1,40}),\s*([A-Z]{2})\b/);
  if (us?.[2] && US_STATES[us[2].toLowerCase()]) {
    return { city: us[1]?.trim(), province: us[2], country: "United States" };
  }

  const country = text.match(/\b([A-Z][A-Za-z. -]{1,40}),\s*(Canada|United States|USA|UK|United Kingdom|France|Germany|India|Tunisia)\b/);
  if (country) {
    return {
      city: country[1]?.trim(),
      country: country[2] === "USA" ? "United States" : country[2],
    };
  }

  return {};
}

export function heuristicExtractResume(text: string): ResumeExtraction {
  const normalized = normalizeResumeText(text);
  const { firstName, lastName } = extractProbableName(normalized);
  const sections = splitSections(normalized);
  const location = extractLocation(headerText(normalized));

  const experienceSource = sections.experience || (DATE_RANGE_RE.test(normalized) ? normalized : "");
  const experience = extractExperience(experienceSource);
  const education = extractEducation(sections.education || "");
  const skills = extractSkills(normalized, sections.skills ?? "");

  return {
    personal: {
      firstName,
      lastName,
      email: findFirst(EMAIL_RE, normalized),
      phone: findFirst(PHONE_RE, normalized),
      city: location.city,
      province: location.province,
      country: location.country,
      linkedinUrl: findFirst(LINKEDIN_RE, normalized),
      githubUrl: findFirst(GITHUB_RE, normalized),
      portfolioUrl: findFirst(PORTFOLIO_RE, normalized),
    },
    summary: extractSummary(sections.preamble ?? "", sections.summary ?? ""),
    workAuthorization: extractAuthorization(normalized),
    yearsOfExperience: extractYears(normalized) ?? inferYearsFromExperience(experience),
    skills,
    experience,
    education,
    certifications: extractCertifications(sections.certifications ?? "", normalized),
    languages: extractLanguages(sections.languages ?? ""),
    projects: [],
  };
}
