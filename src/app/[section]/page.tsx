import AppShell from "@/components/app-shell";
import { notFound } from "next/navigation";

const sections = ["dashboard", "products", "inventory", "low-stock", "suppliers", "purchase-orders", "receiving", "reports", "settings"];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default function SectionPage({ params }: { params: { section: string } }) {
  if (!sections.includes(params.section)) notFound();
  return <AppShell section={params.section} />;
}
