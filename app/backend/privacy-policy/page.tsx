import { redirect } from "next/navigation";

// Moved under /backend/content.
export default function Page() {
  redirect("/backend/content/privacy-policy");
}
