import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingSoonPage({ title, phase }: { title: string; phase: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Coming in {phase}.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        This section isn&apos;t implemented yet. Following the phased build plan, it will be added
        once its prerequisites exist.
      </CardContent>
    </Card>
  );
}
