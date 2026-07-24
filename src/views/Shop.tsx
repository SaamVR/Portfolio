import ContextAwareShopPage from "@/components/storefront/shop/ContextAwareShopPage";

interface ShopProps {
  explicitStoreId?: string;
}

const Shop = ({ explicitStoreId }: ShopProps = {}) => {
  return <ContextAwareShopPage explicitStoreId={explicitStoreId} />;
};

export default Shop;
