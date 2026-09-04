import { redirect } from "next/navigation";

export default function MockRedirectPage() {
  redirect("/mocks");
}