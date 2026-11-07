import PublicPages from "@/components/public-pages";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create an account | Event Florist" };

export default function RegisterPage() {
  return <PublicPages page="register" />;
}
