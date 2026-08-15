import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  redirect("/account/admin/communities");
}
