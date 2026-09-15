import { Sparkles, X, Check, Zap, MessageSquare, BookOpen, Mail } from 'lucide-react';
import { usePlan } from '@/lib/usePlan';

interface UpgradeModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
}

export default function UpgradeModal({ open, reason, onClose }: UpgradeModalProps) {
  const { upgrade } = usePlan();

  if (!open) return null;

  const features = [
    { icon: BookOpen, text: 'Unlimited subjects' },
    { icon: MessageSquare, text: 'Unlimited AI chat messages' },
    { icon: Zap, text: '10-question quizzes with adaptive difficulty' },
    { icon: Mail, text: 'Weekly progress email summary' },
  ];

  const handleUpgrade = async () => {
    await upgrade();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-6 sm:p-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-ice-300" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-navy-800">Upgrade to Pro</h2>
              <p className="text-navy-400 text-xs">Unlock everything</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-navy-50 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {reason && (
          <div className="bg-coral-50 border border-coral-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-coral-700 text-sm">{reason}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-navy-700 text-sm">{feature.text}</span>
                <Check className="w-4 h-4 text-teal-500 ml-auto shrink-0" />
              </div>
            );
          })}
        </div>

        <div className="bg-navy-50 rounded-xl p-4 mb-5">
          <div className="flex items-baseline gap-1">
            <span className="font-serif text-3xl text-navy-800">$9</span>
            <span className="text-navy-400 text-sm">/month</span>
          </div>
          <p className="text-navy-500 text-xs mt-1">Cancel anytime</p>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">
            Maybe later
          </button>
          <button
            onClick={handleUpgrade}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Upgrade now
          </button>
        </div>
      </div>
    </div>
  );
}
