import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Package, MapPin, Heart, LogOut, ChevronRight, Plus, Truck,
  CheckCircle, Clock, Box, X, Edit3, Trash2,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/lib/auth';
import { sampleOrders, sampleAddresses } from '@/data/products';
import type { Order } from '@/types';

type Tab = 'profile' | 'orders' | 'addresses' | 'favorites';

const statusConfig: Record<Order['status'], { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  'Hazırlanıyor': { icon: Clock, color: 'text-caramel-600', bg: 'bg-caramel-100' },
  'Kargoda': { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
  'Teslim Edildi': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  'İptal Edildi': { icon: X, color: 'text-ember-600', bg: 'bg-ember-500/10' },
};

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const favCount = useStore((s) => s.favorites.length);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { id: 'profile', label: 'Profil Bilgilerim', icon: User },
    { id: 'orders', label: 'Siparişlerim', icon: Package, count: sampleOrders.length },
    { id: 'addresses', label: 'Adreslerim', icon: MapPin, count: sampleAddresses.length },
    { id: 'favorites', label: 'Favorilerim', icon: Heart, count: favCount },
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-espresso-400 mb-6">
        <Link to="/" className="hover:text-caramel-600 transition-colors">Ana Sayfa</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-espresso-700 font-medium">Hesabım</span>
      </nav>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-espresso-100 p-5 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full bg-espresso-700 flex items-center justify-center">
                <User className="w-7 h-7 text-caramel-400" />
              </div>
              <div>
                <p className="font-bold text-espresso-800">{user?.email?.split('@')[0] || 'Misafir'}</p>
                <p className="text-xs text-espresso-400">{user?.email || 'Giriş yapmadınız'}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-espresso-50">
              <div className="text-center">
                <p className="text-lg font-bold text-espresso-800">{sampleOrders.length}</p>
                <p className="text-[10px] text-espresso-400">Sipariş</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-espresso-800">{favCount}</p>
                <p className="text-[10px] text-espresso-400">Favori</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-espresso-800">{sampleAddresses.length}</p>
                <p className="text-[10px] text-espresso-400">Adres</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="bg-white rounded-2xl border border-espresso-100 p-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-caramel-100 text-caramel-700'
                    : 'text-espresso-600 hover:bg-cream-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-espresso-100 text-espresso-600 text-xs font-semibold">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-ember-500 hover:bg-ember-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
              Çıkış Yap
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {/* Profile */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-espresso-100 p-6"
              >
                <h2 className="text-xl font-bold text-espresso-800 mb-5">Profil Bilgilerim</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {[
                    { label: 'Ad Soyad', value: user?.user_metadata?.name || 'Ahmet Yılmaz' },
                    { label: 'E-posta', value: user?.email || 'ahmet@email.com' },
                    { label: 'Telefon', value: '0532 123 45 67' },
                    { label: 'Üyelik Tarihi', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '15 Mart 2025' },
                  ].map((field) => (
                    <div key={field.label}>
                      <label className="text-xs text-espresso-400 font-medium mb-1.5 block">{field.label}</label>
                      <input
                        type="text"
                        defaultValue={field.value}
                        readOnly
                        className="w-full h-11 px-4 rounded-xl bg-cream-50 border border-espresso-100 text-sm text-espresso-700 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <button className="mt-6 px-6 py-2.5 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white text-sm font-semibold transition-colors">
                  Bilgileri Güncelle
                </button>
              </motion.div>
            )}

            {/* Orders */}
            {activeTab === 'orders' && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold text-espresso-800 mb-2">Siparişlerim</h2>
                {sampleOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  const expanded = expandedOrder === order.id;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-espresso-100 overflow-hidden">
                      <button
                        onClick={() => setExpandedOrder(expanded ? null : order.id)}
                        className="w-full flex items-center gap-4 p-5 hover:bg-cream-50 transition-colors text-left"
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${statusConfig[order.status].bg}`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig[order.status].color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-espresso-800 text-sm">{order.id}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[order.status].bg} ${statusConfig[order.status].color}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs text-espresso-400 mt-0.5">{order.date} · {order.itemCount} ürün</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-espresso-800">{order.total} TL</p>
                          <ChevronRight className={`w-4 h-4 text-espresso-300 ml-auto transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 pt-0 border-t border-espresso-50 space-y-3">
                              {order.items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2">
                                  <div>
                                    <p className="text-sm font-medium text-espresso-700">{item.name}</p>
                                    <p className="text-xs text-espresso-400">{item.quantity}x · {item.grind}</p>
                                  </div>
                                  <p className="text-sm font-semibold text-espresso-700">{item.price * item.quantity} TL</p>
                                </div>
                              ))}
                              <div className="flex gap-2 pt-3">
                                <button className="flex-1 px-4 py-2.5 rounded-xl bg-cream-100 hover:bg-cream-200 text-espresso-700 text-sm font-medium transition-colors">
                                  Sipariş Detayı
                                </button>
                                {order.status === 'Teslim Edildi' && (
                                  <button className="flex-1 px-4 py-2.5 rounded-xl bg-caramel-100 hover:bg-caramel-200 text-caramel-700 text-sm font-medium transition-colors">
                                    Tekrar Satın Al
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Addresses */}
            {activeTab === 'addresses' && (
              <motion.div
                key="addresses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-espresso-800">Adreslerim</h2>
                  <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-caramel-400 hover:bg-caramel-500 text-white text-sm font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> Yeni Adres
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {sampleAddresses.map((addr) => (
                    <div key={addr.id} className="bg-white rounded-2xl border border-espresso-100 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-cream-200 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-espresso-600" />
                          </div>
                          <p className="font-semibold text-espresso-800">{addr.title}</p>
                          {addr.isDefault && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                              Varsayılan
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button className="p-2 text-espresso-400 hover:text-caramel-600 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-espresso-400 hover:text-ember-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-espresso-700">{addr.fullName}</p>
                      <p className="text-sm text-espresso-500 mt-1">{addr.phone}</p>
                      <p className="text-sm text-espresso-500 mt-2">{addr.detail}</p>
                      <p className="text-sm text-espresso-500">{addr.district} / {addr.city}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Favorites */}
            {activeTab === 'favorites' && (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-espresso-800">Favorilerim</h2>
                  <Link to="/favorites" className="text-sm font-medium text-caramel-600 hover:text-caramel-700 transition-colors">
                    Tümünü Gör
                  </Link>
                </div>
                {favCount > 0 ? (
                  <p className="text-espresso-500">{favCount} favori ürününüz var.</p>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="w-12 h-12 text-espresso-200 mx-auto mb-3" />
                    <p className="text-espresso-500 mb-4">Henüz favori ürününüz yok.</p>
                    <Link to="/" className="text-caramel-600 hover:underline text-sm">Kahve keşfet</Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
