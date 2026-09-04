import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { adminGetProduct, listCategories, nextItemId } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  if (!/^\d+$/.test(raw)) notFound();

  const product = adminGetProduct(Number(raw));
  if (!product) notFound();

  return (
    <ProductForm categories={listCategories(true)} suggestedItemId={nextItemId()} product={product} />
  );
}
