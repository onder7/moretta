import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFound() {
  return (
    <div className="container mx-auto px-4 py-24 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
      <p className="text-xl mb-8">Aradığınız sayfa bulunamadı.</p>
      <Button render={<Link to="/" />}>Ana Sayfaya Dön</Button>
    </div>
  );
}
