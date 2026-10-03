import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getAllStores, getTeamMembers } from "@/lib/store";
import { assertSuperAdmin, getSuperAdminEmail } from "@/lib/auth";
import TeamManagementClient from "@/components/TeamManagementClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team & Store Access | Credo Admin",
  description: "Invite store admins and control which restaurant locations they can manage.",
};

export default async function TeamPage() {
  await connection();

  const auth = await assertSuperAdmin();
  if (!auth.authorized) {
    redirect("/admin");
  }

  const [members, stores] = await Promise.all([getTeamMembers(), getAllStores()]);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
      <TeamManagementClient
        initialMembers={members}
        stores={stores}
        superAdminEmail={getSuperAdminEmail()}
      />
    </main>
  );
}
