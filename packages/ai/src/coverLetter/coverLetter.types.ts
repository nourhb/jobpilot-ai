/** Minimal job shape the cover letter generator needs -- avoids a hard dependency on the Prisma Job model from this package. */
export interface CoverLetterJob {
  title: string;
  company: string;
  description: string;
}

/**
 * Section 29 input: "Match analysis" is optional context from an
 * already-computed JobMatch (section 25/26) used to decide which
 * verified skills to foreground. Never required -- a cover letter can
 * be generated before a match has been computed.
 */
export interface CoverLetterMatchContext {
  matchedSkills?: string[];
}
