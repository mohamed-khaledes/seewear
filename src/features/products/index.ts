/** Public surface of the products feature. Client-safe. */
export { ProductCard } from "./components/product-card";
export { ProductGrid } from "./components/product-grid";
export { ProductResults } from "./components/product-results";
export { ProductDetailView } from "./components/product-detail-view";
export { ModelPeekPanel } from "./components/model-peek-panel";
export { Viewer3DToggle } from "./components/viewer-3d-toggle";
export { ProductListPage } from "./pages/product-list-page";
export { ProductDetailPage } from "./pages/product-detail-page";
export * from "./services/utils/filters";
export { useCatalogFacets, useCategories, useProductsInfinite } from "./hooks/use-products";
export * from "./services/utils/variants";
export { toCartLine } from "./services/utils/to-cart-line";
export {
  fetchCatalogFacetsFromBrowser,
  fetchCategoriesFromBrowser,
  fetchProductsFromBrowser,
  searchProductsFromBrowser,
} from "./services/api/products.client";
export * from "./types";
