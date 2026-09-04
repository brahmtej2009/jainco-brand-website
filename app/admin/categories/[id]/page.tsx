import { notFound } from 'next/navigation';
import CategoryForm from '@/components/admin/CategoryForm';
import { listCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  if (!/^\d+$/.test(raw)) notFound();

  const category = listCategories(true).find((entry) => entry.id === Number(raw));
  if (!category) notFound();

  return <CategoryForm category={category} />;
}
