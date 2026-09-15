import { Sparkles, X, Check, Zap, MessageSquare, BookOpen, Mail, Lock } from 'lucide-react';
import { usePlan } from '@/lib/usePlan';

interface UpgradeModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
}

const freeFeatures = [
  { icon: BookOpen, text: 'Up to 2 active subjects', included: true },
  { icon: MessageSquare, text: '20 AI chat messages per day', included: true },
  { icon: Zap, text: '5-question quizzes, fixed difficulty', included: true },
  { icon: Mail, text: 'Weekly progress email', included: false },
];

const proFeatures = [
  { icon: BookOpen, text: 'Unlimited subjects', included: true },
  { icon: MessageSquare, text: 'Unlimited AI chat messages', included: true },
  { icon: Zap, text: '10-question quizzes, adaptive difficulty', included: true },
  { icon: Mail, text: 'Weekly progress email summary', included: true },
];

export default function UpgradeModal({ open, reason, onClose }: UpgradeModalProps) {
  const { plan, upgrade, downgrade } = usePlan();

  if (!open) return null;

  const handleSelectFree = async () => {
    if (plan !== 'free') {
      await downgrade();
    }
    onClose();
  };

  const handleSelectPro = async () => {
    if (plan !== 'pro') {
      await upgrade();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 sm:p-8 animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-navy-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-ice-300" />
            </div>
            <div>
              <h2 className="font-serif text-xl text-navy-800">Choose your plan</h2>
              <p className="text-navy-400 text-xs">Switch anytime — your data stays safe</p>
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

        {/* Plan cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {/* Free plan card */}
          <div
            className={`rounded-2xl border-2 p-5 transition-all duration-200 ${
              plan === 'free'
                ? 'border-navy-700 bg-navy-50'
                : 'border-navy-200 bg-white hover:border-navy-300'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg text-navy-800">Free</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-serif text-2xl text-navy-700">$0</span>
                  <span className="text-navy-400 text-xs">/month</span>
                </div>
              </div>
              {plan === 'free' && (
                <span className="text-[10px] font-medium uppercase tracking-wider bg-navy-700 text-white px-2.5 py-1 rounded-full">
                  Current
                </span>
              )}
            </div>

            <div className="space-y-2.5 mb-5">
              {freeFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.text} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      feature.included ? 'bg-teal-50' : 'bg-navy-100'
                    }`}>
                      {feature.included ? (
                        <Check className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-navy-400" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      feature.included ? 'text-navy-700' : 'text-navy-400'
                    }`}>
                      {feature.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSelectFree}
              disabled={plan === 'free'}
              className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
                plan === 'free'
                  ? 'bg-navy-100 text-navy-400 cursor-default'
                  : 'border-2 border-navy-200 text-navy-700 hover:border-navy-300 hover:bg-navy-50'
              }`}
            >
              {plan === 'free' ? 'Your current plan' : 'Switch to Free'}
            </button>
          </div>

          {/* Pro plan card */}
          <div
            className={`rounded-2xl border-2 p-5 transition-all duration-200 relative ${
              plan === 'pro'
                ? 'border-navy-700 bg-navy-50'
                : 'border-navy-300 bg-white hover:border-navy-400'
            }`}
          >
            {/* Pro badge */}
            <div className="absolute -top-3 left-5">
              <span className="text-[10px] font-medium uppercase tracking-wider bg-navy-800 text-ice-300 px-3 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Recommended
              </span>
            </div>

            <div className="flex items-center justify-between mb-4 mt-1">
              <div>
                <h3 className="font-serif text-lg text-navy-800">Pro</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-serif text-2xl text-navy-700">$9</span>
                  <span className="text-navy-400 text-xs">/month</span>
                </div>
              </div>
              {plan === 'pro' && (
                <span className="text-[10px] font-medium uppercase tracking-wider bg-navy-700 text-white px-2.5 py-1 rounded-full">
                  Current
                </span>
              )}
            </div>

            <div className="space-y-2.5 mb-5">
              {proFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.text} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                    </div>
                    <span className="text-sm text-navy-700">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSelectPro}
              disabled={plan === 'pro'}
              className={`w-full rounded-xl py-2.5 text-sm font-medium transition-all ${
                plan === 'pro'
                  ? 'bg-navy-100 text-navy-400 cursor-default'
                  : 'bg-navy-800 text-white hover:bg-navy-700 active:scale-[0.98]'
              }`}
            >
              {plan === 'pro' ? 'Your current plan' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>

        {/* Shared features note */}
        <div className="bg-ice-50 border border-ice-200 rounded-xl px-4 py-3">
          <p className="text-navy-600 text-xs leading-relaxed">
            <span className="font-medium text-navy-700">Available on both plans:</span>{' '}
            Calendar booking and missed-session reschedule — no limits on either plan.
          </p>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
