import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/apiClient";
import { useDeleteResume, useResumes, useUploadResume } from "@/hooks/useProfile";

function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function ResumePage() {
  const { data: resumes, isLoading } = useResumes();
  const upload = useUploadResume();
  const deleteResume = useDeleteResume();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: () => {
        if (inputRef.current) inputRef.current.value = "";
      },
    });
  };

  const activeResume = resumes?.find((r) => r.isActive);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Resume</h1>
        <p className="text-muted-foreground">
          Upload a PDF or DOCX resume. JobPilot extracts your experience, education, skills, and
          certifications automatically -- but nothing extracted is trusted until you review and confirm it
          on the <Link to="/profile" className="font-medium text-primary hover:underline">Profile</Link> page.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a new resume</CardTitle>
          <CardDescription>PDF or DOCX, up to 10MB. Uploading a new resume creates a new version.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-accent/50" : "border-input"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <p className="text-sm text-muted-foreground">Drag and drop your resume here, or</p>
            <Button
              variant="outline"
              size="sm"
              disabled={upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {upload.isPending ? "Uploading..." : "Choose file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {upload.isError && (
            <p className="mt-3 text-sm text-destructive">
              {upload.error instanceof ApiError ? upload.error.message : "Upload failed. Please try again."}
            </p>
          )}
          {upload.isSuccess && (
            <p className="mt-3 text-sm text-emerald-600">
              Uploaded. Confidence {formatConfidence(upload.data.resume.confidenceScore)} —{" "}
              {upload.data.resume.reviewRequired
                ? "please review the extracted items on your Profile page."
                : "extracted items are ready to review."}
            </p>
          )}
        </CardContent>
      </Card>

      {activeResume && (
        <Card>
          <CardHeader>
            <CardTitle>Active resume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{activeResume.originalFilename}</p>
                <p className="text-sm text-muted-foreground">
                  Version {activeResume.version} · Extraction confidence{" "}
                  {formatConfidence(activeResume.confidenceScore)}
                  {activeResume.reviewRequired ? " · Review required" : ""}
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/profile">Review extracted items</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Resume history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && (resumes?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>
          )}
          {resumes?.map((resume) => (
            <div key={resume.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
              <div>
                <p className="font-medium">
                  {resume.originalFilename}{" "}
                  {resume.isActive && (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Version {resume.version} · Confidence {formatConfidence(resume.confidenceScore)} ·{" "}
                  {new Date(resume.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleteResume.isPending}
                onClick={() => deleteResume.mutate(resume.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
