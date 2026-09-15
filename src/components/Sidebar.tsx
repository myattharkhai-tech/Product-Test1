import { Map, Upload, Calendar, Sparkles, Mail, Zap } from 'lucide-react';
import type { Screen } from '@/types';
import { usePlan } from '@/lib/usePlan';

interface SidebarProps {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

const navItems: { id: Screen; label: string; icon: typeof Map; description: string }[] = [
  { id: 'roadmap', label: 'Roadmap', icon: Map, description: 'Your study plan' },
  { id: 'upload', label: 'Upload', icon: Upload, description: 'Add materials' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Weekly schedule' },
];

export default function Sidebar({ current, onNavigate }: SidebarProps) {
  const activeScreen: Screen = current === 'subject-roadmap' ? 'roadmap' : current;
  const { plan, weeklyEmailEnabled, toggleWeeklyEmail, upgrade } = usePlan();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden sm:flex flex-col w-64 bg-navy-800 text-white min-h-screen sticky top-0 shrink-0">
        <div className="px-6 py-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ice-300 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-navy-800" />
            </div>
            <div>
              <h1 className="font-serif text-lg leading-tight">StudyFlow</h1>
              <p className="text-navy-300 text-xs">From chaos to clarity</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1
                  transition-all duration-200 text-left
                  ${
                    isActive
                      ? 'bg-navy-700 text-white'
                      : 'text-navy-300 hover:bg-navy-700/50 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={`text-xs ${isActive ? 'text-navy-200' : 'text-navy-400'}`}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-navy-700">
          {plan === 'pro' ? (
            <div className="bg-navy-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-ice-300" />
                <p className="text-ice-300 text-xs font-medium">Pro plan active</p>
              </div>
              <button
                onClick={() => toggleWeeklyEmail(!weeklyEmailEnabled)}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-navy-300" />
                  <span className="text-navy-300 text-xs">Weekly email</span>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${
                    weeklyEmailEnabled ? 'bg-teal-500' : 'bg-navy-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                      weeklyEmailEnabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </button>
            </div>
          ) : (
            <div className="bg-navy-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-ice-300" />
                <p className="text-ice-300 text-xs font-medium">Free plan</p>
              </div>
              <p className="text-navy-300 text-xs leading-relaxed mb-3">
                2 subjects, 20 chat messages/day, 5-question quizzes.
              </p>
              <button
                onClick={() => upgrade()}
                className="w-full rounded-lg bg-ice-300 text-navy-800 text-xs font-medium py-2
                  hover:bg-ice-200 transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-navy-800 text-white flex items-center justify-around px-2 py-2 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg
                transition-all duration-200
                ${isActive ? 'text-ice-300' : 'text-navy-300'}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
