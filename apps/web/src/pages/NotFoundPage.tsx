import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <BrandMark />
      <p className="page-eyebrow">Error 404</p>
      <h1 className="page-title">This page doesn&apos;t exist</h1>
      <p className="page-lede">The link may be out of date, or the job was removed from the catalog.</p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
