import { useState } from "react";
import {
  profileUpdateSchema,
  WORK_AUTHORIZATION_STATUSES,
  WORK_AUTHORIZATION_LABELS,
  REMOTE_PREFERENCES,
  type CertificationInput,
  type EducationInput,
  type ProfileUpdateInput,
  type SkillInput,
  type WorkExperienceInput,
} from "@jobpilot/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/services/apiClient";
import type {
  CertificationRecord,
  EducationRecord,
  SkillRecord,
  WorkExperienceRecord,
} from "@/services/profileService";
import {
  useAddCertification,
  useAddEducation,
  useAddSkill,
  useAddExperience,
  useDeleteCertification,
  useDeleteEducation,
  useDeleteSkill,
  useDeleteExperience,
  useProfile,
  useUpdateProfile,
  useVerifyProfileItems,
} from "@/hooks/useProfile";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";
const textareaClassName =
  "w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

/** Badge showing whether a profile item is a confirmed fact or still awaiting user review. */
function VerifiedBadge({ verified, source }: { verified: boolean; source: string }) {
  if (verified) {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        Verified
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      {source === "RESUME_PARSED" ? "From resume — needs review" : "Unverified"}
    </span>
  );
}

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Loading profile...</p>;
  }

  const unverifiedExperienceIds = profile.workExperiences.filter((e) => !e.verified).map((e) => e.id);
  const unverifiedEducationIds = profile.educations.filter((e) => !e.verified).map((e) => e.id);
  const unverifiedSkillIds = profile.skills.filter((s) => !s.verified).map((s) => s.id);
  const unverifiedCertificationIds = profile.certifications.filter((c) => !c.verified).map((c) => c.id);
  const hasUnverifiedItems =
    unverifiedExperienceIds.length > 0 ||
    unverifiedEducationIds.length > 0 ||
    unverifiedSkillIds.length > 0 ||
    unverifiedCertificationIds.length > 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          This is the single source of truth JobPilot uses when applying on your behalf. Only items marked
          "Verified" are ever used to answer application questions — the AI never invents experience,
          education, or credentials.
        </p>
      </div>

      {hasUnverifiedItems && (
        <PendingVerificationCard
          experienceIds={unverifiedExperienceIds}
          educationIds={unverifiedEducationIds}
          skillIds={unverifiedSkillIds}
          certificationIds={unverifiedCertificationIds}
        />
      )}

      <ProfileSummaryCard
        profile={{
          professionalSummary: profile.professionalSummary,
          yearsOfExperience: profile.yearsOfExperience,
          workAuthorization: profile.workAuthorization,
          requiresSponsorship: profile.requiresSponsorship,
          willingToRelocate: profile.willingToRelocate,
          remotePreference: profile.remotePreference,
          minimumSalary: profile.minimumSalary,
          maximumSalary: profile.maximumSalary,
        }}
      />

      <ExperienceCard items={profile.workExperiences} />
      <EducationCard items={profile.educations} />
      <SkillsCard items={profile.skills} />
      <CertificationsCard items={profile.certifications} />
    </div>
  );
}

function PendingVerificationCard(props: {
  experienceIds: string[];
  educationIds: string[];
  skillIds: string[];
  certificationIds: string[];
}) {
  const verify = useVerifyProfileItems();
  const totalCount =
    props.experienceIds.length + props.educationIds.length + props.skillIds.length + props.certificationIds.length;

  return (
    <Card className="border-amber-300 dark:border-amber-800">
      <CardHeader>
        <CardTitle>Confirm items from your resume</CardTitle>
        <CardDescription>
          {totalCount} item{totalCount === 1 ? "" : "s"} extracted from your uploaded resume{" "}
          {totalCount === 1 ? "is" : "are"} awaiting your confirmation. Nothing extracted from a resume is used
          to apply to jobs until you confirm it below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          disabled={verify.isPending}
          onClick={() =>
            verify.mutate({
              workExperienceIds: props.experienceIds,
              educationIds: props.educationIds,
              skillIds: props.skillIds,
              certificationIds: props.certificationIds,
            })
          }
        >
          {verify.isPending ? "Confirming..." : `Confirm all ${totalCount} item(s) as accurate`}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileSummaryCard({ profile }: { profile: ProfileUpdateInput }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: profile,
  });

  const onSubmit = (values: ProfileUpdateInput) => updateProfile.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary & work eligibility</CardTitle>
        <CardDescription>Used to answer application questions truthfully — edit anytime.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="professionalSummary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional summary</FormLabel>
                  <FormControl>
                    <textarea
                      className={textareaClassName}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearsOfExperience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of experience</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workAuthorization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Work authorization</FormLabel>
                    <FormControl>
                      <select
                        className={selectClassName}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                      >
                        <option value="">Not specified</option>
                        {WORK_AUTHORIZATION_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {WORK_AUTHORIZATION_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="requiresSponsorship"
                render={({ field }) => (
                  <FormItem className="flex-row items-center">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Requires visa sponsorship</FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="willingToRelocate"
                render={({ field }) => (
                  <FormItem className="flex-row items-center">
                    <FormControl>
                      <input
                        type="checkbox"
                        className="size-4"
                        checked={field.value ?? false}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    </FormControl>
                    <FormLabel className="mb-0">Willing to relocate</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="remotePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remote preference</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                    >
                      <option value="">Not specified</option>
                      {REMOTE_PREFERENCES.map((pref) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minimumSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum salary (annual)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maximumSalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum salary (annual)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {updateProfile.isError && (
              <p className="text-sm text-destructive">
                {updateProfile.error instanceof ApiError ? updateProfile.error.message : "Failed to save."}
              </p>
            )}
            {updateProfile.isSuccess && <p className="text-sm text-emerald-600">Saved.</p>}

            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function ExperienceCard({ items }: { items: WorkExperienceRecord[] }) {
  const addExperience = useAddExperience();
  const deleteExperience = useDeleteExperience();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    company: "",
    jobTitle: "",
    location: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    description: "",
  });

  const submit = () => {
    const input: WorkExperienceInput = {
      company: form.company,
      jobTitle: form.jobTitle,
      location: form.location || null,
      startDate: new Date(form.startDate),
      endDate: form.isCurrent || !form.endDate ? null : new Date(form.endDate),
      isCurrent: form.isCurrent,
      description: form.description || null,
    };
    addExperience.mutate(input, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ company: "", jobTitle: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work experience</CardTitle>
        <CardDescription>Only verified entries are used when applying to jobs.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No work experience added yet.</p>}
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {item.jobTitle} · {item.company}
                </p>
                <p className="text-sm text-muted-foreground">
                  {toDateInputValue(item.startDate)} — {item.isCurrent ? "Present" : toDateInputValue(item.endDate)}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
                {item.description && <p className="mt-1 text-sm">{item.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <VerifiedBadge verified={item.verified} source={item.source} />
                <Button variant="ghost" size="sm" onClick={() => deleteExperience.mutate(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <Separator className="mt-3" />
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Job title"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
              />
              <Input
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                type="date"
                disabled={form.isCurrent}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={form.isCurrent}
                onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked }))}
              />
              I currently work here
            </label>
            <textarea
              className={textareaClassName}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.company || !form.jobTitle || !form.startDate || addExperience.isPending}
                onClick={submit}
              >
                {addExperience.isPending ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            + Add work experience
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EducationCard({ items }: { items: EducationRecord[] }) {
  const addEducation = useAddEducation();
  const deleteEducation = useDeleteEducation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ institution: "", degree: "", field: "", startDate: "", endDate: "", description: "" });

  const submit = () => {
    const input: EducationInput = {
      institution: form.institution,
      degree: form.degree,
      field: form.field || null,
      startDate: form.startDate ? new Date(form.startDate) : null,
      endDate: form.endDate ? new Date(form.endDate) : null,
      description: form.description || null,
    };
    addEducation.mutate(input, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ institution: "", degree: "", field: "", startDate: "", endDate: "", description: "" });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Education</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No education added yet.</p>}
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {item.degree}
                  {item.field ? `, ${item.field}` : ""} · {item.institution}
                </p>
                <p className="text-sm text-muted-foreground">
                  {toDateInputValue(item.startDate)} — {toDateInputValue(item.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <VerifiedBadge verified={item.verified} source={item.source} />
                <Button variant="ghost" size="sm" onClick={() => deleteEducation.mutate(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <Separator className="mt-3" />
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Institution"
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
              />
              <Input
                placeholder="Degree"
                value={form.degree}
                onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
              />
            </div>
            <Input
              placeholder="Field of study (optional)"
              value={form.field}
              onChange={(e) => setForm((f) => ({ ...f, field: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!form.institution || !form.degree || addEducation.isPending}
                onClick={submit}
              >
                {addEducation.isPending ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            + Add education
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SkillsCard({ items }: { items: SkillRecord[] }) {
  const addSkill = useAddSkill();
  const deleteSkill = useDeleteSkill();
  const [name, setName] = useState("");

  const submit = () => {
    const input: SkillInput = { name, category: null, proficiency: null, yearsExperience: null };
    addSkill.mutate(input, { onSuccess: () => setName("") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item.id}
              className="flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-sm"
            >
              {item.name}
              <VerifiedBadge verified={item.verified} source={item.source} />
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => deleteSkill.mutate(item.id)}
                aria-label={`Remove ${item.name}`}
              >
                ×
              </button>
            </span>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill (e.g. TypeScript)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name && submit()}
          />
          <Button size="sm" disabled={!name || addSkill.isPending} onClick={submit}>
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CertificationsCard({ items }: { items: CertificationRecord[] }) {
  const addCertification = useAddCertification();
  const deleteCertification = useDeleteCertification();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", issuer: "", issuedAt: "", expiresAt: "" });

  const submit = () => {
    const input: CertificationInput = {
      name: form.name,
      issuer: form.issuer || null,
      issuedAt: form.issuedAt ? new Date(form.issuedAt) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
    };
    addCertification.mutate(input, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ name: "", issuer: "", issuedAt: "", expiresAt: "" });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No certifications added yet.</p>}
        {items.map((item) => (
          <div key={item.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.issuer}
                  {item.issuedAt ? ` · Issued ${toDateInputValue(item.issuedAt)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <VerifiedBadge verified={item.verified} source={item.source} />
                <Button variant="ghost" size="sm" onClick={() => deleteCertification.mutate(item.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <Separator className="mt-3" />
          </div>
        ))}

        {showForm ? (
          <div className="space-y-3 rounded-md border p-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Certification name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="Issuer (optional)"
                value={form.issuer}
                onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={form.issuedAt}
                onChange={(e) => setForm((f) => ({ ...f, issuedAt: e.target.value }))}
              />
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={!form.name || addCertification.isPending} onClick={submit}>
                {addCertification.isPending ? "Adding..." : "Add"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            + Add certification
          </Button>
        )}
      </CardContent>
    </Card>
  );
}