import { useEffect, useState } from "react";
import { JOB_EMPLOYMENT_TYPES, JOB_SOURCE_TYPES, type JobEmploymentType, type JobPreferenceUpdateInput, type JobSourceTypeName } from "@jobpilot/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/services/apiClient";
import { PageHeader } from "@/components/PageHeader";
import { usePreferences, useUpdatePreferences } from "@/hooks/usePreferences";

const EMPLOYMENT_TYPE_LABELS: Record<JobEmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
  INTERNSHIP: "Internship",
  UNKNOWN: "Unspecified",
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

interface FormState {
  targetTitles: string;
  excludedTitles: string;
  countries: string;
  provinces: string;
  cities: string;
  remote: boolean;
  hybrid: boolean;
  onsite: boolean;
  minSalary: string;
  maxSalary: string;
  employmentTypes: JobEmploymentType[];
  experienceLevels: string;
  requireWorkAuthorization: boolean;
  requireNoSponsorship: boolean;
  minimumMatchScore: number;
  autoApplyEnabled: boolean;
  autoCoverLetterEnabled: boolean;
  autoQuestionAnswerEnabled: boolean;
  maxApplicationsPerDay: number;
  maxApplicationsPerHour: number;
  allowedSourceTypes: JobSourceTypeName[];
}

export function PreferencesPage() {
  const { data: preferences, isLoading } = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!preferences) return;
    setForm({
      targetTitles: preferences.targetTitles.join(", "),
      excludedTitles: preferences.excludedTitles.join(", "),
      countries: preferences.countries.join(", "),
      provinces: preferences.provinces.join(", "),
      cities: preferences.cities.join(", "),
      remote: preferences.remote,
      hybrid: preferences.hybrid,
      onsite: preferences.onsite,
      minSalary: preferences.minSalary?.toString() ?? "",
      maxSalary: preferences.maxSalary?.toString() ?? "",
      employmentTypes: preferences.employmentTypes,
      experienceLevels: preferences.experienceLevels.join(", "),
      requireWorkAuthorization: preferences.requireWorkAuthorization,
      requireNoSponsorship: preferences.requireNoSponsorship,
      minimumMatchScore: preferences.minimumMatchScore,
      autoApplyEnabled: preferences.autoApplyEnabled,
      autoCoverLetterEnabled: preferences.autoCoverLetterEnabled,
      autoQuestionAnswerEnabled: preferences.autoQuestionAnswerEnabled,
      maxApplicationsPerDay: preferences.maxApplicationsPerDay,
      maxApplicationsPerHour: preferences.maxApplicationsPerHour,
      allowedSourceTypes: preferences.allowedSourceTypes as JobSourceTypeName[],
    });
  }, [preferences]);

  if (isLoading || !form) {
    return <p className="text-sm text-muted-foreground">Loading preferences...</p>;
  }

  function toggleEmploymentType(type: JobEmploymentType) {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.employmentTypes.includes(type);
      return { ...prev, employmentTypes: has ? prev.employmentTypes.filter((t) => t !== type) : [...prev.employmentTypes, type] };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaved(false);

    const input: JobPreferenceUpdateInput = {
      targetTitles: parseCsv(form.targetTitles),
      excludedTitles: parseCsv(form.excludedTitles),
      countries: parseCsv(form.countries),
      provinces: parseCsv(form.provinces),
      cities: parseCsv(form.cities),
      remote: form.remote,
      hybrid: form.hybrid,
      onsite: form.onsite,
      minSalary: form.minSalary ? Number(form.minSalary) : null,
      maxSalary: form.maxSalary ? Number(form.maxSalary) : null,
      employmentTypes: form.employmentTypes,
      experienceLevels: parseCsv(form.experienceLevels),
      requireWorkAuthorization: form.requireWorkAuthorization,
      requireNoSponsorship: form.requireNoSponsorship,
      minimumMatchScore: form.minimumMatchScore,
      autoApplyEnabled: form.autoApplyEnabled,
      autoCoverLetterEnabled: form.autoCoverLetterEnabled,
      autoQuestionAnswerEnabled: form.autoQuestionAnswerEnabled,
      maxApplicationsPerDay: form.maxApplicationsPerDay,
      maxApplicationsPerHour: form.maxApplicationsPerHour,
      allowedSourceTypes: form.allowedSourceTypes,
    };

    try {
      await updatePreferences.mutateAsync(input);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save preferences.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Controls"
        title="Job preferences"
        description="Hard filters exclude jobs outright. The remaining weights shape match scores — never the LLM."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Titles</CardTitle>
            <CardDescription>Comma-separated. Target titles boost your match score; excluded titles are hard-filtered out.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target titles</Label>
              <Input value={form.targetTitles} onChange={(e) => setForm({ ...form, targetTitles: e.target.value })} placeholder="Cloud Support Engineer, DevOps Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Excluded titles</Label>
              <Input value={form.excludedTitles} onChange={(e) => setForm({ ...form, excludedTitles: e.target.value })} placeholder="Sales Manager" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location</CardTitle>
            <CardDescription>Jobs outside your configured countries are hard-filtered out (defaults to Canada only).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Countries</Label>
              <Input value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} placeholder="Canada" />
            </div>
            <div className="space-y-2">
              <Label>Provinces</Label>
              <Input value={form.provinces} onChange={(e) => setForm({ ...form, provinces: e.target.value })} placeholder="Ontario, British Columbia" />
            </div>
            <div className="space-y-2">
              <Label>Cities</Label>
              <Input value={form.cities} onChange={(e) => setForm({ ...form, cities: e.target.value })} placeholder="Toronto, Vancouver" />
            </div>
            <div className="flex flex-wrap gap-6">
              {(["remote", "hybrid", "onsite"] as const).map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                  {key === "remote" ? "Remote" : key === "hybrid" ? "Hybrid" : "Onsite"}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compensation & role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum salary (CAD)</Label>
                <Input type="number" value={form.minSalary} onChange={(e) => setForm({ ...form, minSalary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Maximum salary (CAD)</Label>
                <Input type="number" value={form.maxSalary} onChange={(e) => setForm({ ...form, maxSalary: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Employment types</Label>
              <div className="flex flex-wrap gap-4">
                {JOB_EMPLOYMENT_TYPES.filter((t) => t !== "UNKNOWN").map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.employmentTypes.includes(type)} onChange={() => toggleEmploymentType(type)} />
                    {EMPLOYMENT_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Experience levels (comma-separated: entry, mid, senior, lead)</Label>
              <Input value={form.experienceLevels} onChange={(e) => setForm({ ...form, experienceLevels: e.target.value })} placeholder="Leave blank to accept any level" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work authorization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requireWorkAuthorization}
                onChange={(e) => setForm({ ...form, requireWorkAuthorization: e.target.checked })}
              />
              Require my work authorization status to be set before matching a job
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.requireNoSponsorship}
                onChange={(e) => setForm({ ...form, requireNoSponsorship: e.target.checked })}
              />
              Skip jobs that explicitly rule out sponsorship (only applies if your profile says you require sponsorship)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Automation</CardTitle>
            <CardDescription>
              The minimum score (section 28) required for the system to mark a job APPLY instead of REVIEW or SKIP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Minimum match score to auto-apply ({form.minimumMatchScore})</Label>
              <input
                type="range"
                min={0}
                max={100}
                value={form.minimumMatchScore}
                onChange={(e) => setForm({ ...form, minimumMatchScore: Number(e.target.value) })}
                className="w-full"
              />
            </div>
            <Separator />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.autoApplyEnabled} onChange={(e) => setForm({ ...form, autoApplyEnabled: e.target.checked })} />
              Enable auto-apply (Phase 6+)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoCoverLetterEnabled}
                onChange={(e) => setForm({ ...form, autoCoverLetterEnabled: e.target.checked })}
              />
              Auto-generate cover letters (Phase 5+)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoQuestionAnswerEnabled}
                onChange={(e) => setForm({ ...form, autoQuestionAnswerEnabled: e.target.checked })}
              />
              Auto-answer application questions (Phase 5+)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maximum applications / day</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxApplicationsPerDay}
                  onChange={(e) => setForm({ ...form, maxApplicationsPerDay: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum applications / hour</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.maxApplicationsPerHour}
                  onChange={(e) => setForm({ ...form, maxApplicationsPerHour: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed sources (leave all unchecked for every enabled source)</Label>
              <div className="flex flex-wrap gap-4">
                {JOB_SOURCE_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.allowedSourceTypes.includes(type)}
                      onChange={() => {
                        const has = form.allowedSourceTypes.includes(type);
                        setForm({
                          ...form,
                          allowedSourceTypes: has
                            ? form.allowedSourceTypes.filter((value) => value !== type)
                            : [...form.allowedSourceTypes, type],
                        });
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !updatePreferences.isPending && <p className="text-sm text-emerald-600 dark:text-emerald-400">Preferences saved.</p>}

        <Button type="submit" disabled={updatePreferences.isPending}>
          {updatePreferences.isPending ? "Saving..." : "Save preferences"}
        </Button>
      </form>
    </div>
  );
}
