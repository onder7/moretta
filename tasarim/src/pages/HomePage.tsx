import Hero from '@/components/Hero';
import QuickCategories from '@/components/QuickCategories';
import FlashDeals from '@/components/FlashDeals';
import FeaturedProducts from '@/components/FeaturedProducts';
import CoffeeFinder from '@/components/CoffeeFinder';

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickCategories />
      <FlashDeals />
      <FeaturedProducts />
      <CoffeeFinder />
    </>
  );
}
