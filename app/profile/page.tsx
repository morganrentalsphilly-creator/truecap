import { redirect } from "next/navigation";
import { Header } from "@/components/investcalc/header";
import { ProfileForm } from "@/components/profile/profile-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    (user.user_metadata?.name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Account";

  const firstName = profile?.first_name ?? fallbackName.split(" ")[0] ?? "";
  const lastName = profile?.last_name ?? fallbackName.split(" ").slice(1).join(" ");

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <ProfileForm
          userId={user.id}
          initialEmail={user.email ?? ""}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialAvatarUrl={profile?.avatar_url}
        />
      </main>
    </>
  );
}
