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
    postedAt: "2026-09-22T14:00:00.000Z",
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
    postedAt: "2026-09-23T09:00:00.000Z",
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
    postedAt: "2026-09-24T16:30:00.000Z",
  },
  {
    externalId: "mock-004",
    title: "Salesforce Developer",
    company: "Experis",
    description: "Build and customize Salesforce applications for Canadian public-sector and enterprise clients.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 80000,
    salaryMax: 105000,
    postedAt: "2026-09-24T17:00:00.000Z",
  },
  {
    externalId: "mock-005",
    title: "Core Network as a Service Test Developer",
    company: "Ericsson",
    description: "Write automated tests for cloud-native 5G core network services.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 95000,
    salaryMax: 125000,
    postedAt: "2026-09-24T08:00:00.000Z",
  },
  {
    externalId: "mock-006",
    title: "Drupal Developer – Web Applications & Public Sector Projects",
    company: "Design Centered Co.",
    description: "Deliver Drupal and PHP web applications for government and non-profit clients.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    postedAt: "2026-09-22T12:00:00.000Z",
  },
  {
    externalId: "mock-007",
    title: "Full-Stack Developer",
    company: "Shopify",
    description: "Build merchant-facing product features with React, TypeScript, and Ruby on Rails.",
    location: "Ottawa, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 110000,
    salaryMax: 150000,
    postedAt: "2026-09-21T10:00:00.000Z",
  },
  {
    externalId: "mock-008",
    title: "Frontend Engineer",
    company: "Wealthsimple",
    description: "Ship accessible React interfaces for investing and tax products.",
    location: "Toronto, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 100000,
    salaryMax: 140000,
    postedAt: "2026-09-20T15:00:00.000Z",
  },
  {
    externalId: "mock-009",
    title: "Backend Developer (Node.js)",
    company: "Lightspeed",
    description: "Design REST APIs and event-driven services for retail and restaurant platforms.",
    location: "Montreal, Quebec, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 95000,
    salaryMax: 130000,
    postedAt: "2026-09-19T11:00:00.000Z",
  },
  {
    externalId: "mock-010",
    title: "React Native Developer",
    company: "Coveo",
    description: "Build cross-platform mobile experiences for enterprise search products.",
    location: "Quebec City, Quebec, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 90000,
    salaryMax: 120000,
    postedAt: "2026-09-18T09:30:00.000Z",
  },
  {
    externalId: "mock-011",
    title: "Python Developer",
    company: "CGI",
    description: "Develop data and automation services for federal digital transformation programs.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "CONTRACT",
    salaryMin: 85000,
    salaryMax: 110000,
    postedAt: "2026-09-17T13:00:00.000Z",
  },
  {
    externalId: "mock-012",
    title: "Cloud Engineer",
    company: "Kinaxis",
    description: "Operate AWS infrastructure, Terraform modules, and Kubernetes clusters for supply-chain SaaS.",
    location: "Ottawa, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 105000,
    salaryMax: 135000,
    postedAt: "2026-09-16T16:00:00.000Z",
  },
  {
    externalId: "mock-013",
    title: "Software Developer Intern",
    company: "Nokia",
    description: "Contribute to network-software features and internal developer tools.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "INTERNSHIP",
    postedAt: "2026-09-15T10:00:00.000Z",
  },
  {
    externalId: "mock-014",
    title: "Java Developer",
    company: "Bank of Canada",
    description: "Maintain secure Java services supporting payment and market-operations systems.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 88000,
    salaryMax: 115000,
    postedAt: "2026-09-14T12:00:00.000Z",
  },
  {
    externalId: "mock-015",
    title: "TypeScript Engineer",
    company: "Hopper",
    description: "Build booking-funnel features and internal tools in TypeScript and Node.js.",
    location: "Montreal, Quebec, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 100000,
    salaryMax: 145000,
    postedAt: "2026-09-13T08:45:00.000Z",
  },
  {
    externalId: "mock-016",
    title: "Platform Engineer",
    company: "SSENSE",
    description: "Own CI/CD, container platforms, and developer experience for a high-traffic commerce stack.",
    location: "Montreal, Quebec, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 115000,
    salaryMax: 150000,
    postedAt: "2026-09-12T14:20:00.000Z",
  },
  {
    externalId: "mock-017",
    title: "WordPress / PHP Developer",
    company: "OpenText",
    description: "Customize CMS platforms and integrate them with enterprise APIs.",
    location: "Waterloo, Ontario, Canada",
    remote: true,
    employmentType: "CONTRACT",
    postedAt: "2026-09-11T09:00:00.000Z",
  },
  {
    externalId: "mock-018",
    title: "Data Engineer",
    company: "Intact Financial",
    description: "Build reliable data pipelines on AWS and Snowflake for insurance analytics.",
    location: "Toronto, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 100000,
    salaryMax: 135000,
    postedAt: "2026-09-10T11:15:00.000Z",
  },
  {
    externalId: "mock-019",
    title: "QA Automation Developer",
    company: "BlackBerry",
    description: "Write end-to-end and API tests for secure communications products.",
    location: "Waterloo, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 80000,
    salaryMax: 105000,
    postedAt: "2026-09-09T15:40:00.000Z",
  },
  {
    externalId: "mock-020",
    title: "MERN Stack Developer",
    company: "ThinkOn",
    description: "Deliver full-stack web applications with MongoDB, Express, React, and Node.js.",
    location: "Mississauga, Ontario, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 85000,
    salaryMax: 115000,
    postedAt: "2026-09-08T18:00:00.000Z",
  },
  {
    externalId: "mock-021",
    title: "Site Reliability Engineer",
    company: "Clio",
    description: "Improve reliability, observability, and on-call practice for legal-practice software.",
    location: "Vancouver, British Columbia, Canada",
    remote: true,
    employmentType: "FULL_TIME",
    salaryMin: 120000,
    salaryMax: 155000,
    postedAt: "2026-09-07T10:00:00.000Z",
  },
  {
    externalId: "mock-022",
    title: "Angular Developer",
    company: "Canada Revenue Agency",
    description: "Modernize internal tax-administration interfaces with Angular and TypeScript.",
    location: "Ottawa, Ontario, Canada",
    remote: false,
    employmentType: "FULL_TIME",
    salaryMin: 78000,
    salaryMax: 98000,
    postedAt: "2026-09-06T13:25:00.000Z",
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
  rateLimit: { requestsPerMinute: 60, concurrency: 4 },

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
