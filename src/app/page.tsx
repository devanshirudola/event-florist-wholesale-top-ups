import PublicPages from "@/components/public-pages";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Florist | Wholesale inventory, made simpler",
  description: "A considered workspace for event florist inventory, suppliers, wholesale orders, and goods receiving.",
};

export default function Home() {
  return <PublicPages page="landing" />;
}
