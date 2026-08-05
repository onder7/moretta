import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Wand2, Sparkles } from 'lucide-react';

const questions = [
  {
    id: 'roast',
    text: 'Hangi kavrum seviyesini seversin?',
    options: ['Açık & Meyvemsi', 'Orta & Dengeli', 'Koyu & Yoğun'],
  },
  {
    id: 'method',
    text: 'Kahveni nasıl demlersin?',
    options: ['Filtre / V60', 'Espresso', 'French Press', 'Moka Pot'],
  },
  {
    id: 'flavor',
    text: 'Hangi tat profili sana uygun?',
    options: ['Çikolata & Karamel', 'Meyvemsi & Narenciye', 'Fındık & Badem', 'Baharatlı'],
  },
];

export default function CoffeeFinder() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const select = (qid: string, val: string) => {
    setAnswers((a) => ({ ...a, [qid]: val }));
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
  };

  return (
    <section className="max-w-8xl mx-auto px-4 py-8">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-espresso-700 via-espresso-800 to-espresso-900 p-6 sm:p-10 lg:p-14">
        {/* Decorative beans */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-caramel-400/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-ember-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

        <div className="relative grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="w-5 h-5 text-caramel-400" />
              <span className="text-sm font-semibold text-caramel-400 uppercase tracking-wide">Kahve Bulucu</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cream-50 leading-tight mb-3 text-balance">
              Damak tadına uygun kahveni bul
            </h2>
            <p className="text-cream-300 mb-6 max-w-md">
              3 soruluk mini test ile sana en uygun kahve çekirdeklerini keşfet. Tadım notların, sertlik derecen ve demleme yöntemine göre özel seçki.
            </p>

            {/* Progress */}
            <div className="flex gap-2 mb-6">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= step || done ? 'bg-caramel-400' : 'bg-espresso-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Quiz */}
          <div className="bg-white/5 backdrop-blur rounded-2xl p-5 sm:p-6 border border-white/10">
            <AnimatePresence mode="wait">
              {!done ? (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xs text-caramel-400 font-semibold mb-2">
                    Soru {step + 1} / {questions.length}
                  </p>
                  <h3 className="text-lg font-semibold text-cream-50 mb-4">
                    {questions[step].text}
                  </h3>
                  <div className="space-y-2">
                    {questions[step].options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => select(questions[step].id, opt)}
                        className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-caramel-400/20 border border-white/10 hover:border-caramel-400/50 text-cream-100 text-sm font-medium transition-all"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-full bg-caramel-400 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-cream-50 mb-2">Kahveni bulduk!</h3>
                  <p className="text-sm text-cream-300 mb-5">
                    {answers.flavor} sevenler için {answers.method} uyumlu, {answers.roast?.split(' ')[0]} kavrum öneriyoruz.
                  </p>
                  <Link to="/category/kahve" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-caramel-400 hover:bg-caramel-500 text-white font-semibold text-sm transition-colors">
                    Seçkimi Gör <ArrowRight className="w-4 h-4" />
                  </Link>
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


