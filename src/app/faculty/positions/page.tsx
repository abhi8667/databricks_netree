import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Button, Empty } from "@/components/ui/primitives";
import { requireUser } from "@/lib/auth";
import { interestsForOwner, opportunitiesOf } from "@/lib/repo";
import { PositionsBoard } from "./board";

export default async function PositionsPage() {
  const user = await requireUser();
  const [positions, interests] = await Promise.all([
    opportunitiesOf(user.user_id),
    interestsForOwner(user.user_id),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
        <PageHeader
          eyebrow="Positions"
          title="Projects you are staffing"
          description="Students apply against what you write here, so state the hours and the commitment plainly."
          actions={
            <Button asChild variant="emerald" size="sm">
              <Link href="/faculty/positions/new">
                <FilePlus2 className="h-4 w-4" />
                Post a position
              </Link>
            </Button>
          }
        />
      </section>

      {positions.length === 0 ? (
        <section className="rounded-3xl border border-rule/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl dark:border-dark-border/80 dark:bg-dark-card/95 sm:p-8">
          <Empty
            title="No positions posted."
            action={
              <Button asChild variant="emerald" size="sm" className="mt-1">
                <Link href="/faculty/positions/new">Post the first one</Link>
              </Button>
            }
          >
            This is the direct route: instead of waiting for a proposal that fits, describe the work
            you need done and let students come to it.
          </Empty>
        </section>
      ) : (
        <PositionsBoard positions={positions} interests={interests} />
      )}
    </div>
  );
}
