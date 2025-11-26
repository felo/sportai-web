import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/ProfilePage";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your SportAI profile, sports, equipment, and preferences.",
};

export default function ProfileRoute() {
  return <ProfilePage />;
}

