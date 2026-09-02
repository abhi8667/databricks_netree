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
    <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10">
      <PageHeader
        eyebrow="Positions"
        title="Projects you are staffing"
        description="Students apply against what you write here, so state the hours and the commitment plainly."
        actions={
          <Button asChild size="sm">
            <Link href="/faculty/positions/new">
              <FilePlus2 className="h-4 w-4" />
              Post a position
            </Link>
          </Button>
        }
      />

      {positions.length === 0 ? (
        <div className="mt-8">
          <Empty
            title="No positions posted."
            action={
              <Button asChild size="sm" className="mt-1">
                <Link href="/faculty/positions/new">Post the first one</Link>
              </Button>
            }
          >
            This is the direct route: instead of waiting for a proposal that fits, describe the work
            you need done and let students come to it.
          </Empty>
        </div>
      ) : (
        <PositionsBoard positions={positions} interests={interests} />
      )}
    </div>
  );
}
