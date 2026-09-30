import React from "react";
import { connection } from "next/server";
import { getFeedbacks, getAllStores } from "@/lib/store";
import FeedbackInboxClient from "@/components/FeedbackInboxClient";

export const metadata = {
  title: "Reputation Firewall Inbox | ReviewBoost Admin",
  description: "Private manager feedback inbox intercepting 1-3 star negative complaints before Google Reviews.",
};

export default async function FeedbackPage() {
  await connection();

  const [feedbacks, stores] = await Promise.all([getFeedbacks(), getAllStores()]);

  return (
    <main className="p-6 sm:p-10 max-w-7xl mx-auto w-full">
      <FeedbackInboxClient initialFeedbacks={feedbacks} stores={stores} />
    </main>
  );
}
