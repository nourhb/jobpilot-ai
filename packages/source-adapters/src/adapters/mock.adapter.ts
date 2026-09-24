import type { ApplicationForm, ApplicationPayload, ApplicationResult, JobSourceAdapter, RawJob } from "../base/types";

/**
 * In-repo fixture adapter implementing the exact same `JobSourceAdapter`
 * contract real adapters (Greenhouse/Lever/Ashby, Phase 7) will use. This
 * is what proves the discovery -> normalize -> dedupe -> store pipeline
 * (Phase 3) end-to-end without ever calling a real employer, and is also
 * what the Mock ATS (Phase 6) submits fake applications against.
 *
 * Deliberately small and deterministic -- no randomness, no network
 * calls -- so tests stay fast and reproducible.
 */
export interface MockRawJobData {
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  remote: boolean;
  employmentType: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt: string;
}

const FIXTURE_JOBS: MockRawJobData[] = [
  {
    externalId: "mock-001",
    title: "Cloud Support Engineer",
    company: "Northwind Cloud",
    description:
      "Support customers running workloads on our managed Kubernetes platform. Requires Docker, Kubernetes and Linux experience.",
    location: "Toronto, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 75000,
    salaryMax: 95000,
    postedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    externalId: "mock-002",
    title: "DevOps Engineer",
    company: "Northwind Cloud",
    description: "Own our CI/CD pipelines and Terraform-managed infrastructure across AWS accounts.",
    location: "Remote, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 90000,
    salaryMax: 120000,
    postedAt: "2026-09-05T00:00:00.000Z",
  },
  {
    externalId: "mock-003",
    title: "Junior Cloud Administrator",
    company: "Acme Technologies",
    description: "Entry-level role administering Azure resources and assisting with on-call rotations.",
    location: "Hamilton, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 55000,
    salaryMax: 68000,
    postedAt: "2026-09-10T00:00:00.000Z",
  },
];

function toRawJob(data: MockRawJobData): RawJob {
  return {
    sourceName: "mock",
    externalId: data.externalId,
    raw: data,
    fetchedAt: new Date().toISOString(),
  };
}

export const mockJobSourceAdapter: JobSourceAdapter = {
  sourceName: "mock",

  async discoverJobs(): Promise<RawJob[]> {
    return FIXTURE_JOBS.map(toRawJob);
  },

  async getJobDetails(externalId: string): Promise<RawJob> {
    const found = FIXTURE_JOBS.find((job) => job.externalId === externalId);
    if (!found) {
      throw new Error(`Mock job not found: ${externalId}`);
    }
    return toRawJob(found);
  },

  async getApplicationForm(externalId: string): Promise<ApplicationForm> {
    const found = FIXTURE_JOBS.find((job) => job.externalId === externalId);
    if (!found) {
      throw new Error(`Mock job not found: ${externalId}`);
    }
    return {
      sourceName: "mock",
      externalId,
      fields: [
        { id: "fullName", label: "Full name", type: "TEXT", required: true },
        { id: "email", label: "Email", type: "EMAIL", required: true },
        { id: "phone", label: "Phone", type: "PHONE", required: false },
        { id: "resume", label: "Resume", type: "FILE", required: true },
        { id: "coverLetter", label: "Cover letter", type: "TEXTAREA", required: false },
        {
          id: "workAuthorization",
          label: "Are you legally authorized to work in Canada?",
          type: "BOOLEAN",
          required: true,
        },
      ],
    };
  },

  async submitApplication(application: ApplicationPayload): Promise<ApplicationResult> {
    const found = FIXTURE_JOBS.find((job) => job.externalId === application.externalId);
    if (!found) {
      return { status: "FAILED", message: `Mock job not found: ${application.externalId}` };
    }
    return {
      status: "SUBMITTED",
      externalApplicationId: `mock-app-${application.idempotencyKey.slice(0, 12)}`,
      message: "Application received.",
    };
  },
};
