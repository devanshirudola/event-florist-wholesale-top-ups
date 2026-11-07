import PublicPages from "@/components/public-pages";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Log in | Event Florist" };

export default function LoginPage() {
  return <PublicPages page="login" />;
}
