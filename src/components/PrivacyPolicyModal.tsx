import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose, t }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl max-h-[80vh] bg-bg-secondary border border-border-primary rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 md:p-8 border-b border-border-primary flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent-primary/10 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">{t.privacy}</h3>
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">Son Güncelleme: 16 Nisan 2026</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
              <p className="text-text-primary opacity-90 leading-relaxed">
                Netfoy olarak dijital gizliliğinize en üst düzeyde saygı duyuyoruz. Uygulamamızı geliştirirken benimsediğimiz temel ilke: <span className="text-accent-primary font-bold">"Sizin veriniz, sizin cihazınızda kalır."</span>
              </p>

              <div className="space-y-4">
                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    1. Hangi Verileri Topluyoruz?
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Netfoy, kullanıcılarından hiçbir kişisel bilgi (isim, e-posta, telefon numarası vb.) talep etmez. Bir kullanıcı hesabı veya şifreleme sistemi bulunmamaktadır.
                  </p>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    2. Verileriniz Nerede Saklanıyor?
                  </h4>
                  <div className="text-sm text-text-secondary leading-relaxed space-y-3">
                    <p>Uygulamaya eklediğiniz tüm varlıklar, borçlar, işlemler ve portföy bilgileri yalnızca o an kullandığınız cihazın tarayıcı önbelleğinde (Local Storage) saklanır. Netfoy'un bu verilerin tutulduğu bir merkezi sunucusu veya veritabanı yoktur. Bu nedenle:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Biz (Netfoy geliştiricileri) finansal verilerinize erişemeyiz.</li>
                      <li>Verileriniz üçüncü şahıslarla paylaşılamaz veya satılamaz.</li>
                      <li>Tarayıcı geçmişinizi veya site verilerini temizlerseniz, Netfoy üzerindeki portföyünüz de kalıcı olarak silinir.</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    3. Üçüncü Taraf Hizmetleri
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Uygulama, size anlık piyasa fiyatlarını (döviz, altın vb.) sunabilmek için güvenilir dış API servisleri (örn. CollectAPI) ile iletişim kurar. Bu işlem sırasında sadece piyasa verileri çekilir; sizin cihazınızdaki portföy rakamları veya kişisel tercihleriniz bu servislere gönderilmez.
                  </p>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    4. Çerezler (Cookies)
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Netfoy, reklam veya takip çerezleri kullanmaz. Sadece seçtiğiniz tema (Karanlık/Kahve/Yeşil) ve arayüz dizilimi gibi tercihlerinizi hatırlamak için cihazınızın yerel depolama alanını kullanır.
                  </p>
                </section>
              </div>
            </div>

            <div className="p-6 border-t border-border-primary shrink-0">
              <button
                onClick={onClose}
                className="w-full py-4 bg-accent-primary text-white font-bold rounded-2xl hover:bg-accent-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-accent-primary/20"
              >
                {t.ok}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
