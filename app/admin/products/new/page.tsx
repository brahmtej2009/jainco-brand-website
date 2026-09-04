import ProductForm from '@/components/admin/ProductForm';
import { listCategories, nextItemId } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return <ProductForm categories={listCategories(true)} suggestedItemId={nextItemId()} product={null} />;
}
