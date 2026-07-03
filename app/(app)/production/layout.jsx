import ProductionAccessGuard from '@/components/production/ProductionAccessGuard';

export default function ProductionLayout({ children }) {
  return <ProductionAccessGuard>{children}</ProductionAccessGuard>;
}
