import CategoriesList from '@/components/admin/CategoriesList';
import { listCategories } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default function AdminCategoriesPage() {
  return <CategoriesList categories={listCategories(true)} />;
}
