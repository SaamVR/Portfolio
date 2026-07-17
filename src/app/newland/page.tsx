import type { Metadata } from "next";
import { NewLandLandingPage } from "@/components/marketing/NewLandLandingPage";

export const metadata: Metadata = {
  title: "EZCome New Landing",
  description: "A clearer, more user-friendly landing page concept for EZCome.",
};

export default function NewLandPage() {
  return <NewLandLandingPage />;
}
