import AppShell from "@/components/app-shell";

export default function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  return <AppShell section="order-detail" orderId={params.id} />;
}
