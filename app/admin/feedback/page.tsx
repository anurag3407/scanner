import React from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getFeedbacks, getAllStores, getStoresByIds } from "@/lib/store";
import { getSessionUser, scopedStoreIds } from "@/lib/auth";
import FeedbackInboxClient from "@/components/FeedbackInboxClient";

export const metadata = {
  title: "Reputation Firewall Inbox | ReviewBoost Admin",
  description: "Private manager feedback inbox intercepting 1-3 star negative complaints before Google Reviews.",
};

export default async function FeedbackPage() {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }

  const scope = scopedStoreIds(user);
  const [feedbacks, stores] = await Promise.all([
    scope === null ? getFeedbacks() : getFeedbacks(undefined, scope),
    scope === null ? getAllStores() : getStoresByIds(scope),
  ]);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
      <FeedbackInboxClient initialFeedbacks={feedbacks} stores={stores} />
    </main>
  );
}
