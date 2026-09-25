import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { accountService } from "@/services/accountService";
import { ApiError } from "@/services/apiClient";
import { PageHeader } from "@/components/PageHeader";

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      await accountService.deleteAccount();
      setUser(null);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Session security and data deletion. Secrets never leave the API."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Signed in as {user?.email ?? "unknown"}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Authentication uses an httpOnly cookie. The browser never stores JWT_SECRET, ENCRYPTION_KEY, or API keys.</p>
          <p>Mutating requests are origin-checked (CSRF). CAPTCHA and anti-bot controls are never bypassed.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delete account</CardTitle>
          <CardDescription>
            Permanently removes this user, profile, applications, notifications, and stored resume files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Type DELETE to confirm.</p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="destructive" disabled={confirmation !== "DELETE" || pending} onClick={() => void onDelete()}>
            {pending ? "Deleting..." : "Delete account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
