import type {
  CertificationInput,
  EducationInput,
  ProfileUpdateInput,
  SkillInput,
  VerifyProfileItemsInput,
  WorkExperienceInput,
} from "@jobpilot/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";

const PROFILE_QUERY_KEY = ["profile"] as const;
const RESUMES_QUERY_KEY = ["profile", "resumes"] as const;
const VERIFIED_PROFILE_QUERY_KEY = ["profile", "verified"] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => (await profileService.getProfile()).profile,
  });
}

export function useVerifiedCandidateProfile() {
  return useQuery({
    queryKey: VERIFIED_PROFILE_QUERY_KEY,
    queryFn: async () => (await profileService.getVerifiedCandidateProfile()).verifiedCandidateProfile,
  });
}

export function useResumes() {
  return useQuery({
    queryKey: RESUMES_QUERY_KEY,
    queryFn: async () => (await profileService.listResumes()).resumes,
  });
}

/** Invalidates every query that could be affected by a profile mutation. */
function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: VERIFIED_PROFILE_QUERY_KEY });
  };
}

export function useUpdateProfile() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: ProfileUpdateInput) => profileService.updateProfile(input),
    onSuccess: invalidate,
  });
}

export function useUploadResume() {
  const invalidate = useInvalidateProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileService.uploadResume(file),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteResume(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: RESUMES_QUERY_KEY }),
  });
}

export function useVerifyProfileItems() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: VerifyProfileItemsInput) => profileService.verifyItems(input),
    onSuccess: invalidate,
  });
}

export function useAddExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: WorkExperienceInput) => profileService.addExperience(input),
    onSuccess: invalidate,
  });
}

export function useUpdateExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WorkExperienceInput }) =>
      profileService.updateExperience(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteExperience() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteExperience(id),
    onSuccess: invalidate,
  });
}

export function useAddEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: EducationInput) => profileService.addEducation(input),
    onSuccess: invalidate,
  });
}

export function useUpdateEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EducationInput }) => profileService.updateEducation(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteEducation() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteEducation(id),
    onSuccess: invalidate,
  });
}

export function useAddSkill() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: SkillInput) => profileService.addSkill(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSkill() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SkillInput }) => profileService.updateSkill(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSkill() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteSkill(id),
    onSuccess: invalidate,
  });
}

export function useAddCertification() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (input: CertificationInput) => profileService.addCertification(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCertification() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CertificationInput }) =>
      profileService.updateCertification(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCertification() {
  const invalidate = useInvalidateProfile();
  return useMutation({
    mutationFn: (id: string) => profileService.deleteCertification(id),
    onSuccess: invalidate,
  });
}
