import AppShell from "@/components/app-shell";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  return <AppShell section="product-detail" productId={params.id} />;
}
