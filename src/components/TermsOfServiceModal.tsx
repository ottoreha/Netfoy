import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose, t }) => {
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
                  <FileText className="w-6 h-6 text-accent-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary">{t.terms}</h3>
                  <p className="text-xs text-text-secondary font-medium uppercase tracking-wider mt-1">{t.termsLastUpdate}</p>
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
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex gap-4">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
                <div className="space-y-2">
                  <h4 className="font-bold text-amber-600">{t.termsDisclaimerTitle}</h4>
                  <p className="text-sm text-text-primary opacity-80 leading-relaxed">
                    {t.termsDisclaimerTextStart}<span className="font-bold underline">{t.termsDisclaimerHighlight}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <section>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t.termsDisclaimerNote1}
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed mt-2">
                    {t.termsDisclaimerNote2}
                  </p>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    {t.termsDataLossTitle}
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t.termsDataLossText}
                  </p>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    {t.termsDisruptionTitle}
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t.termsDisruptionText}
                  </p>
                </section>

                <section>
                  <h4 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-accent-primary rounded-full" />
                    {t.termsModificationTitle}
                  </h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {t.termsModificationText}
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
