/**
 * Upsert every authorized public job source we can legally poll:
 * Greenhouse / Lever / Ashby career boards plus public JSON feeds.
 * Does not scrape Google, Indeed, LinkedIn, or Glassdoor.
 *
 * Usage:
 *   pnpm --filter api exec tsx src/scripts/seedPublicJobSources.ts
 */
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

interface SourceSeed {
  name: string;
  type: "GREENHOUSE" | "LEVER" | "ASHBY" | "COMPANY" | "MOCK";
  config?: Record<string, unknown>;
}

const GREENHOUSE: Array<[string, string]> = [
  ["shopify", "Shopify"],
  ["stripe", "Stripe"],
  ["airbnb", "Airbnb"],
  ["datadog", "Datadog"],
  ["discord", "Discord"],
  ["reddit", "Reddit"],
  ["dropbox", "Dropbox"],
  ["pinterest", "Pinterest"],
  ["mongodb", "MongoDB"],
  ["elastic", "Elastic"],
  ["hashicorp", "HashiCorp"],
  ["snowflake", "Snowflake"],
  ["databricks", "Databricks"],
  ["nvidia", "NVIDIA"],
  ["spotify", "Spotify"],
  ["airtable", "Airtable"],
  ["figma", "Figma"],
  ["zoom", "Zoom"],
  ["okta", "Okta"],
  ["twilio", "Twilio"],
  ["hubspot", "HubSpot"],
  ["instacart", "Instacart"],
  ["doordash", "DoorDash"],
  ["coinbase", "Coinbase"],
  ["robinhood", "Robinhood"],
  ["gitlab", "GitLab"],
  ["cloudflare", "Cloudflare"],
  ["wealthsimple", "Wealthsimple"],
  ["clio", "Clio"],
  ["hootsuite", "Hootsuite"],
  ["docker", "Docker"],
  ["intercom", "Intercom"],
  ["plaid", "Plaid"],
  ["square", "Block"],
  ["toast", "Toast"],
  ["chime", "Chime"],
  ["affirm", "Affirm"],
  ["duolingo", "Duolingo"],
  ["coursera", "Coursera"],
  ["khanacademy", "Khan Academy"],
  ["mozilla", "Mozilla"],
  ["automattic", "Automattic"],
  ["github", "GitHub"],
  ["heroku", "Heroku"],
  ["twosigma", "Two Sigma"],
  ["jane-street", "Jane Street"],
  ["citadel", "Citadel"],
  ["bridgewater", "Bridgewater"],
  ["asana", "Asana"],
  ["slack", "Slack"],
  ["digitalocean", "DigitalOcean"],
  ["fastly", "Fastly"],
  ["grammarly", "Grammarly"],
  ["udacity", "Udacity"],
  ["wikimedia", "Wikimedia"],
  ["expedia", "Expedia"],
  ["tripadvisor", "Tripadvisor"],
  ["paypal", "PayPal"],
  ["capitalone", "Capital One"],
  ["bloomberg", "Bloomberg"],
  ["uber", "Uber"],
  ["rivian", "Rivian"],
  ["tesla", "Tesla"],
  ["spacex", "SpaceX"],
  ["intel", "Intel"],
  ["amd", "AMD"],
  ["lululemon", "lululemon"],
  ["coveo", "Coveo"],
  ["hopper", "Hopper"],
  ["ssense", "SSENSE"],
  ["kinaxis", "Kinaxis"],
  ["lightspeed", "Lightspeed"],
  ["n26", "N26"],
  ["wise", "Wise"],
  ["revolut", "Revolut"],
  ["klarna", "Klarna"],
  ["adyen", "Adyen"],
  ["zendesk", "Zendesk"],
  ["1password", "1Password"],
  ["supabase", "Supabase"],
  ["planetscale", "PlanetScale"],
  ["cloudinary", "Cloudinary"],
  ["sendgrid", "SendGrid"],
  ["mailchimp", "Mailchimp"],
  ["rbc", "RBC"],
  ["td", "TD"],
  ["scotiabank", "Scotiabank"],
  ["bmo", "BMO"],
  ["manulife", "Manulife"],
  ["sunlife", "Sun Life"],
  ["nokia", "Nokia"],
  ["ericsson", "Ericsson"],
  ["cgi", "CGI"],
  ["opentext", "OpenText"],
  ["blackberry", "BlackBerry"],
];

const LEVER: Array<[string, string]> = [
  ["netflix", "Netflix"],
  ["palantir", "Palantir"],
  ["box", "Box"],
  ["canva", "Canva"],
  ["atlassian", "Atlassian"],
  ["nubank", "Nubank"],
  ["lyft", "Lyft"],
  ["reddit", "Reddit"],
  ["twitch", "Twitch"],
  ["medium", "Medium"],
  ["benchling", "Benchling"],
  ["anduril", "Anduril"],
  ["scaleai", "Scale AI"],
  ["faire", "Faire"],
  ["wealthsimple", "Wealthsimple"],
  ["lightspeed", "Lightspeed"],
  ["hopper", "Hopper"],
  ["ssense", "SSENSE"],
  ["figma", "Figma"],
  ["discord", "Discord"],
];

const ASHBY: Array<[string, string]> = [
  ["openai", "OpenAI"],
  ["anthropic", "Anthropic"],
  ["linear", "Linear"],
  ["notion", "Notion"],
  ["ramp", "Ramp"],
  ["vercel", "Vercel"],
  ["perplexity", "Perplexity"],
  ["replicate", "Replicate"],
  ["huggingface", "Hugging Face"],
  ["mercury", "Mercury"],
  ["brex", "Brex"],
  ["rippling", "Rippling"],
  ["cursor", "Cursor"],
  ["anysphere", "Anysphere"],
  ["elevenlabs", "ElevenLabs"],
  ["airtable", "Airtable"],
  ["figma", "Figma"],
  ["notionhq", "Notion"],
  ["openai.com", "OpenAI"],
  ["scale", "Scale"],
  ["databricks", "Databricks"],
  ["replit", "Replit"],
  ["cohere", "Cohere"],
  ["adept", "Adept"],
];

const FEEDS: Array<[string, string]> = [
  ["remoteok", "RemoteOK"],
  ["arbeitnow", "Arbeitnow"],
  ["jobicy", "Jobicy"],
  ["remotive", "Remotive"],
  ["themuse", "The Muse"],
  ["himalayas", "Himalayas"],
  ["workingnomads", "Working Nomads"],
  ["weworkremotely", "We Work Remotely"],
  ["smartrecruiters", "SmartRecruiters"],
];

function sources(): SourceSeed[] {
  return [
    { name: "mock", type: "MOCK" },
    ...GREENHOUSE.map(([token, company]) => ({
      name: `greenhouse:${token}`,
      type: "GREENHOUSE" as const,
      config: { boardToken: token, companyName: company },
    })),
    ...LEVER.map(([company, companyName]) => ({
      name: `lever:${company}`,
      type: "LEVER" as const,
      config: { company, companyName },
    })),
    ...ASHBY.map(([jobBoardName, company]) => ({
      name: `ashby:${jobBoardName}`,
      type: "ASHBY" as const,
      config: { jobBoardName, companyName: company },
    })),
    ...FEEDS.map(([feed, label]) => ({
      name: label,
      type: "COMPANY" as const,
      config: { feed },
    })),
  ];
}

async function main() {
  const seeded = sources();
  for (const source of seeded) {
    await prisma.jobSource.upsert({
      where: { name: source.name },
      update: { type: source.type, config: source.config ?? {}, enabled: true },
      create: { name: source.name, type: source.type, config: source.config ?? {}, enabled: true },
    });
  }
  logger.info({ count: seeded.length }, "Seeded authorized public job sources");
}

main()
  .catch((error) => {
    logger.error({ err: error }, "Failed to seed public job sources");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
