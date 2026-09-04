export type Category = {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  cover_image: string | null;
  position: number;
  visible: number;
  created_at: string;
};

export type FitMode = 'fill' | 'fit';

export type ProductImage = {
  id: number;
  product_id: number;
  file: string;
  width: number;
  height: number;
  alt: string;
  position: number;
  /**
   * The visible rectangle, in fractions of the source image. In "fill" mode it is locked
   * to the catalogue tile ratio, so every filled tile comes out the same size.
   */
  crop_x: number;
  crop_y: number;
  crop_w: number;
  crop_h: number;
  fit_mode: FitMode;
};

export type ProductSpec = {
  id: number;
  product_id: number;
  label: string;
  value: string;
  position: number;
};

export type Product = {
  id: number;
  item_id: number;
  name: string;
  category_id: number | null;
  summary: string;
  description: string;
  material: string;
  dimensions: string;
  capacity: string;
  finish: string;
  colour: string;
  weight: string;
  packing: string;
  moq: string;
  lead_time: string;
  care: string;
  price: number | null;
  currency: string;
  availability: string;
  featured: number;
  visible: number;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ProductWithImages = Product & {
  images: ProductImage[];
  specs: ProductSpec[];
  category_name?: string | null;
  category_slug?: string | null;
};

export type CategoryWithCount = Category & { product_count: number };
