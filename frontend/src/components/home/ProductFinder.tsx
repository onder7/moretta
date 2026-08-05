import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Wand2, Sparkles, Loader2 } from 'lucide-react';
import { productApi, type FilterAttribute } from '@/services/productApi';
import type { Category } from '@/types';

interface Step {
  id: string;
  text: string;
  options: { label: string; value: string }[];
}

function buildAttributeSteps(attributes: FilterAttribute[]): Step[] {
  const steps: Step[] = [];
  for (const attr of attributes.slice(0, 2)) {
    if (attr.values.length < 2) continue;
    steps.push({
      id: `attr:${attr.slug}`,
      text: `Hangi ${attr.name.toLowerCase()} tercih edersin?`,
      options: attr.values.map((v) => ({ label: v.value, value: v.value })),
    });
  }
  return steps;
}

export function ProductFinder() {
  const [phase, setPhase] = useState<'category' | 'attributes' | 'done'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [attrStep, setAttrStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const prevAttrKey = useRef<string | undefined>();
  const navigate = useNavigate();

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productApi.categories(),
    staleTime: 1000 * 60 * 10,
  });
  const categories = (catData?.data?.data ?? []).filter((c: Category) => !c.parentId);

  const { data: filterData, isLoading: filterLoading } = useQuery({
    queryKey: ['filter-options', selectedCategory],
    queryFn: async () => {
      if (selectedCategory) {
        return await productApi.filterOptions(selectedCategory);
      }
      return { data: { data: { attributes: [], brands: [], priceRange: { min: 0, max: 0 } } } };
    },
    enabled: !!selectedCategory,
    staleTime: 1000 * 60 * 10,
  });
  const attributes = filterData?.data?.data?.attributes ?? [];
  const attrSteps = buildAttributeSteps(attributes);

  useEffect(() => {
    if (phase !== 'attributes') return;
    const key = selectedCategory;
    if (key === prevAttrKey.current) return;
    prevAttrKey.current = key;
    if (!filterLoading && attrSteps.length === 0) {
      setPhase('done');
    }
  }, [phase, selectedCategory, filterLoading, attrSteps.length]);

  const totalSteps = 1 + attrSteps.length;
  const currentStepIndex = phase === 'category' ? 0 : phase === 'attributes' ? 1 + attrStep : totalSteps;

  const selectCategory = (slug: string) => {
    const next = { ...answers, category: slug };
    setAnswers(next);
    setSelectedCategory(slug);
    setAttrStep(0);
    setPhase('attributes');
  };

  const selectAttribute = (stepId: string, val: string) => {
    const next = { ...answers, [stepId]: val };
    setAnswers(next);
    if (attrStep < attrSteps.length - 1) {
      setAttrStep((s) => s + 1);
    } else {
      setPhase('done');
    }
  };

  const reset = () => {
    setPhase('category');
    setSelectedCategory(undefined);
    setAttrStep(0);
    setAnswers({});
    prevAttrKey.current = undefined;
  };

  const handleShowResults = () => {
    const categorySlug = answers['category'];
    const params = new URLSearchParams();

    for (const [key, val] of Object.entries(answers)) {
      if (key === 'category') continue;
      if (key.startsWith('attr:')) {
        const attrSlug = key.replace('attr:', '');
        params.append(`attributes[${attrSlug}][]`, val);
      }
    }

    const qs = params.toString();
    if (categorySlug) {
      navigate(`/kategori/${categorySlug}${qs ? `?${qs}` : ''}`);
    } else {
      navigate(`/ara${qs ? `?${qs}` : ''}`);
    }
  };

  const resultSummary = () => {
    const parts: string[] = [];
    const cat = categories.find((c: Category) => c.slug === answers['category']);
    if (cat) parts.push(cat.name);
    for (const [key, val] of Object.entries(answers)) {
      if (key.startsWith('attr:')) parts.push(val);
    }
    return parts.length > 0 ? parts.join(', ') : 'size özel';
  };

  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-espresso-700 via-espresso-800 to-espresso-900 p-6 sm:p-10 lg:p-14">
        <div className="absolute top-0 right-0 w-64 h-64 bg-caramel-400/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-ember-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-caramel-400" />
              <span className="text-sm font-semibold text-caramel-400 uppercase tracking-wide">Ürün Bulucu</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-3 text-balance">
              İhtiyacına uygun ürünü bul
            </h2>
            <p className="text-cream-300 mb-6 max-w-md">
              Birkaç soruluk mini test ile sana en uygun ürünleri keşfet. Kategorine ve tercihlerine göre özel seçki.
            </p>

            <div className="flex gap-2 mb-6">
              {Array.from({ length: Math.max(totalSteps, 1) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < currentStepIndex || phase === 'done' ? 'bg-caramel-400' : 'bg-espresso-600'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-5 sm:p-6 border border-white/10">
            <AnimatePresence mode="wait">
              {phase === 'category' && (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {catLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-caramel-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-caramel-400 font-semibold mb-2">
                        Soru 1 / {totalSteps}
                      </p>
                      <h3 className="text-lg font-semibold text-cream-50 mb-4">
                        Hangi kategoriyle ilgileniyorsun?
                      </h3>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {categories.map((cat: Category) => (
                          <button
                            key={cat.slug}
                            onClick={() => selectCategory(cat.slug)}
                            className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-caramel-400/20 border border-white/10 hover:border-caramel-400/50 text-cream-100 text-sm font-medium transition-all"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {phase === 'attributes' && (
                <motion.div
                  key={`attr-${attrStep}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {filterLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-caramel-400 animate-spin" />
                    </div>
                  ) : attrSteps[attrStep] ? (
                    <>
                      <p className="text-xs text-caramel-400 font-semibold mb-2">
                        Soru {2 + attrStep} / {totalSteps}
                      </p>
                      <h3 className="text-lg font-semibold text-cream-50 mb-4">
                        {attrSteps[attrStep].text}
                      </h3>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {attrSteps[attrStep].options.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => selectAttribute(attrSteps[attrStep].id, opt.value)}
                            className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-caramel-400/20 border border-white/10 hover:border-caramel-400/50 text-cream-100 text-sm font-medium transition-all"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </motion.div>
              )}

              {phase === 'done' && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-caramel-400 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-cream-50 mb-2">Seçkini hazırladık!</h3>
                  <p className="text-sm text-cream-300 mb-5">
                    {resultSummary()} ürünlerini öneriyoruz.
                  </p>
                  <button
                    onClick={handleShowResults}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors"
                  >
                    Seçkimi Gör <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={reset}
                    className="block w-full mt-3 text-xs text-cream-300 hover:text-cream-100 transition-colors"
                  >
                    Testi yeniden başlat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
