import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Minus, Plus, Trash2, ShoppingBag, Tag, ChevronRight, Truck, ArrowRight, X,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function CartPage() {
  const cart = useStore((s) => s.cart);
  const updateQuantity = useStore((s) => s.updateQuantity);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const clearCart = useStore((s) => s.clearCart);
  const cartTotal = useStore((s) => s.cartTotal());

  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState('');

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'KAHVE10') {
      setAppliedPromo('KAHVE10');
      setPromoError('');
    } else {
      setPromoError('Geçersiz indirim kodu.');
      setAppliedPromo(null);
    }
  };

  const discount = appliedPromo ? Math.round(cartTotal * 0.1) : 0;
  const shipping = cartTotal >= 500 ? 0 : 49;
  const grandTotal = cartTotal - discount + shipping;

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-cream-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-12 h-12 text-espresso-300" />
        </div>
        <h1 className="text-2xl font-bold text-espresso-800 mb-2">Sepetiniz Boş</h1>
        <p className="text-espresso-500 mb-8">Henüz sepetinize ürün eklemediniz. Taze kavrulmuş kahvelerimizi keşfedin.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
        >
          Kahveleri Keşfet <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">Sepetim</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold text-espresso-800 mb-6">
        Sepetim ({cart.reduce((s, i) => s + i.quantity, 0)} ürün)
      </h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-espresso-500">{cart.length} farklı ürün</p>
            <button
              onClick={clearCart}
              className="text-sm text-espresso-400 hover:text-ember-500 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Sepeti Temizle
            </button>
          </div>

          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={`${item.product.id}-${item.grind}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex gap-4 p-4 bg-white rounded-2xl border border-espresso-100"
              >
                <Link to={`/product/${item.product.id}`} className="shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover"
                  />
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/product/${item.product.id}`}>
                        <h3 className="font-semibold text-espresso-800 text-sm sm:text-base hover:text-caramel-600 transition-colors line-clamp-2">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-espresso-400 mt-1">
                        {item.product.origin} · {item.product.roast} Kavrum
                      </p>
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cream-100">
                        <span className="text-xs text-espresso-400">Öğütme:</span>
                        <span className="text-xs font-semibold text-espresso-700">{item.grind}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.grind)}
                      className="p-2 text-espresso-300 hover:text-ember-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-3">
                    {/* Qty */}
                    <div className="flex items-center border border-espresso-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.grind, item.quantity - 1)}
                        className="w-8 h-9 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold text-espresso-700">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.grind, item.quantity + 1)}
                        className="w-8 h-9 flex items-center justify-center text-espresso-500 hover:bg-cream-100 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Price */}
                    <div className="text-right">
                      {item.product.oldPrice && (
                        <p className="text-xs text-espresso-300 line-through leading-none">
                          {item.product.oldPrice * item.quantity} TL
                        </p>
                      )}
                      <p className="text-lg font-bold text-espresso-800">{item.product.price * item.quantity} TL</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Continue Shopping */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-caramel-600 hover:text-caramel-700 transition-colors mt-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Alışverişe Devam Et
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-40 bg-white rounded-2xl border border-espresso-100 p-5 sm:p-6">
            <h2 className="text-lg font-bold text-espresso-800 mb-4">Sipariş Özeti</h2>

            {/* Promo Code */}
            <div className="mb-5">
              <label className="text-sm font-medium text-espresso-600 mb-2 block">İndirim Kodu</label>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="flex items-center gap-2 text-sm font-medium text-green-700">
                    <Tag className="w-4 h-4" /> {appliedPromo}
                  </span>
                  <button
                    onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                    className="text-green-600 hover:text-green-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="KAHVE10"
                      className="flex-1 h-10 px-3 rounded-lg border border-espresso-200 text-sm text-espresso-700 placeholder:text-espresso-300 focus:outline-none focus:border-caramel-400 transition-colors"
                    />
                    <button
                      onClick={applyPromo}
                      className="px-4 h-10 rounded-lg bg-espresso-700 hover:bg-espresso-800 text-white text-sm font-medium transition-colors"
                    >
                      Uygula
                    </button>
                  </div>
                  {promoError && <p className="text-xs text-ember-500 mt-1.5">{promoError}</p>}
                </>
              )}
            </div>

            {/* Summary Lines */}
            <div className="space-y-2.5 py-4 border-y border-espresso-100">
              <div className="flex justify-between text-sm">
                <span className="text-espresso-500">Ara Toplam</span>
                <span className="font-medium text-espresso-700">{cartTotal} TL</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">İndirim (%10)</span>
                  <span className="font-medium text-green-600">-{discount} TL</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-espresso-500 flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> Kargo
                </span>
                <span className="font-medium text-espresso-700">
                  {shipping === 0 ? <span className="text-green-600">Ücretsiz</span> : `${shipping} TL`}
                </span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-caramel-600 bg-caramel-50 rounded-lg p-2">
                  {500 - cartTotal} TL daha ekleyin, kargo bedava olsun!
                </p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between items-baseline py-4">
              <span className="text-base font-semibold text-espresso-800">Toplam</span>
              <span className="text-2xl font-bold text-espresso-800">{grandTotal} TL</span>
            </div>

            {/* Checkout Button */}
            <button className="w-full h-12 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors active:scale-[0.98]">
              Ödemeye Geç
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-espresso-400">
              <Truck className="w-4 h-4" /> 500 TL üzeri ücretsiz kargo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
