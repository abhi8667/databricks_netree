import { Splash } from "@/components/splash";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/routes";

export default async function SplashPage() {
  const user = await currentUser();
  return <Splash destination={user ? homeFor(user) : "/login"} />;
}
