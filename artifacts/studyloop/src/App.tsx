import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
  Target,
  TrendingUp,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Flame,
  Headphones,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  NotebookPen,
  Play,
  Plus,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Task = {
  id: number | string;
  title: string;
  course: string;
  due: string;
  durationMinutes: number;
  tone: 'orange' | 'teal' | 'plum';
  completed: boolean;
};

type UpcomingItem = { day: string; date: string; title: string; relative: string; tone?: 'orange' | 'teal' | 'plum' };
type DashboardData = { tasks: Task[]; weeklyProgress: number; streak: number; upcoming: UpcomingItem[] };

const formatToday = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const formatShortToday = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
type Note = { id: number; title: string; content: string; summary: string | null; keyPoints: string[]; createdAt: string; updatedAt: string };
type PlannerResult = { title: string; overview: string; days: Array<{ day: string; focus: string; minutes: number; action: string }>; tips: string[] };
type AssistantResult = { answer: string; takeaways: string[]; practiceQuestion: string };
type NoteSummary = { summary: string; keyPoints: string[] };
type RecoveryItem = { title: string; minutes: number; reason: string };
type RecoveryResult = { status: 'on_track' | 'recovery'; headline: string; realityScore: number; diagnosis: string; today: RecoveryItem[]; tomorrow: RecoveryItem[]; rule: string };

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? 'Something went wrong');
  return response.status === 204 ? (undefined as T) : response.json() as Promise<T>;
}

const navItems = [
  { href: '/dashboard', label: 'Today', icon: LayoutDashboard },
  { href: '/planner', label: 'Planner', icon: CalendarDays },
  { href: '/assistant', label: 'Assistant', icon: BrainCircuit },
  { href: '/quiz', label: 'Quiz lab', icon: ListChecks },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/focus', label: 'Focus room', icon: Timer },
  { href: '/recovery', label: 'Recovery loop', icon: RefreshCw },
];

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/dashboard" className="group inline-flex items-center gap-2.5" data-testid="link-logo">
      <span className={`relative grid size-9 place-items-center rounded-[11px] ${dark ? 'bg-[#f9b85b] text-[#202438]' : 'bg-[#202438] text-[#f9b85b]'}`}>
        <span className="absolute size-4 rounded-full border-[2px] border-current" />
        <span className="absolute h-[2px] w-5 rotate-45 rounded-full bg-current transition-transform duration-300 group-hover:rotate-[135deg]" />
      </span>
      <span className={`font-display text-[22px] font-semibold tracking-[-0.04em] ${dark ? 'text-[#f9f4ea]' : 'text-[#202438]'}`}>StudyLoop</span>
    </Link>
  );
}

function ArrowLink({ href, children, light = false }: { href: string; children: ReactNode; light?: boolean }) {
  const className = `group inline-flex items-center gap-2 text-sm font-bold transition-colors ${light ? 'text-[#f9f4ea] hover:text-[#f9b85b]' : 'text-[#202438] hover:text-[#166b61]'}`;
  const content = <><span>{children}</span><ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" /></>;
  return href.startsWith('#') ? (
    <a href={href} className={className} data-testid={`link-${href.slice(1)}-cta`}>{content}</a>
  ) : (
    <Link href={href} className={className} data-testid={`link-${href.replace('/', '') || 'home'}-cta`}>{content}</Link>
  );
}

function LandingPage() {
  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#f6f0e6] text-[#202438]">
      <section className="relative min-h-[680px] bg-[#202438] px-5 pb-20 pt-6 text-[#f9f4ea] sm:px-8 lg:min-h-[780px] lg:px-14 lg:pt-8">
        <div className="pointer-events-none absolute -right-24 top-20 size-[450px] rounded-full border border-[#f9b85b]/20 sm:size-[650px]" />
        <div className="pointer-events-none absolute -right-8 top-32 size-[330px] rounded-full border border-[#f9b85b]/20 sm:size-[510px]" />
        <div className="pointer-events-none absolute left-[42%] top-[35%] h-px w-[66%] bg-gradient-to-r from-[#f9b85b]/0 via-[#f9b85b]/40 to-[#f9b85b]/0" />
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Logo dark />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
            <a className="text-sm text-[#f9f4ea]/65 transition-colors hover:text-[#f9f4ea]" href="#rhythm" data-testid="link-how-it-works">How it works</a>
            <a className="text-sm text-[#f9f4ea]/65 transition-colors hover:text-[#f9f4ea]" href="#inside" data-testid="link-inside">Inside the loop</a>
            <Link className="rounded-full border border-[#f9f4ea]/20 px-4 py-2 text-sm font-semibold transition-colors hover:border-[#f9b85b] hover:text-[#f9b85b]" href="/dashboard" data-testid="link-sign-in">Open StudyLoop</Link>
          </nav>
          <Link className="rounded-full border border-[#f9f4ea]/20 p-2 md:hidden" href="/dashboard" aria-label="Open StudyLoop dashboard" data-testid="link-mobile-demo">
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 pb-12 pt-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-20 lg:pb-24 lg:pt-36">
          <div className="relative z-10 max-w-2xl">
            <div className="rise-in mb-7 inline-flex items-center gap-2 rounded-full border border-[#f9b85b]/30 bg-[#f9b85b]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f9b85b]">
              <Sparkles className="size-3.5" /> A calmer way to begin
            </div>
            <h1 className="rise-in delay-1 text-balance font-display text-[clamp(3.5rem,9vw,7.9rem)] leading-[0.91] tracking-[-0.065em]">
              Find your <em className="text-[#f9b85b]">next</em> good hour.
            </h1>
            <p className="rise-in delay-2 mt-8 max-w-lg text-lg leading-8 text-[#f9f4ea]/65 sm:text-xl">
              StudyLoop turns the loose ends of student life into one clear place to start. See what matters today, then get moving.
            </p>
            <div className="rise-in delay-3 mt-9 flex flex-wrap items-center gap-5">
              <Link href="/dashboard" className="group inline-flex items-center gap-3 rounded-full bg-[#f9b85b] px-6 py-3.5 text-sm font-extrabold text-[#202438] shadow-[0_12px_30px_-12px_rgba(249,184,91,.7)] transition-transform hover:-translate-y-0.5" data-testid="link-start-studying">
                Start studying <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <ArrowLink href="#rhythm" light>See how it works</ArrowLink>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
            <div className="relative rounded-[30px] border border-[#f9f4ea]/15 bg-[#2c3045] p-3 shadow-2xl shadow-[#141624]/40 sm:p-4">
              <div className="rounded-[22px] bg-[#f6f0e6] p-5 text-[#202438] sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#166b61]">{formatShortToday()}</p>
                    <h2 className="mt-2 font-display text-3xl leading-none">A little at a time.</h2>
                  </div>
                  <span className="grid size-10 place-items-center rounded-full bg-[#f9b85b]/25 text-[#a66017]"><Flame className="size-5" /></span>
                </div>
                <div className="mt-8 rounded-2xl bg-[#202438] p-5 text-[#f9f4ea]">
                  <div className="flex items-center gap-2 text-[#f9b85b]"><Sparkles className="size-4" /><span className="font-mono-ui text-[10px] uppercase tracking-[0.18em]">Personalized workspace</span></div>
                  <p className="mt-4 text-sm leading-6 text-[#f9f4ea]/70">Your dashboard is built from the subjects, tasks, notes, and study sessions you enter.</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-[#f9b85b]/30 bg-[#f9b85b] px-4 py-3 text-[#202438] shadow-lg sm:block">
              <div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-[#202438] text-[#f9b85b]"><Check className="size-3.5" /></span><span className="text-xs font-extrabold">Your progress, your way.</span></div>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-[#f9f4ea]/10 pt-5 text-[10px] font-bold uppercase tracking-[0.17em] text-[#f9f4ea]/35">
          <span>Built for the in-between moments</span><span className="hidden sm:inline">Not more noise. More direction.</span>
        </div>
      </section>

      <section id="rhythm" className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:px-14 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <div>
            <p className="font-mono-ui text-[11px] font-medium uppercase tracking-[0.18em] text-[#166b61]">The daily rhythm</p>
            <h2 className="mt-5 max-w-md font-display text-5xl leading-[.98] tracking-[-.04em] sm:text-6xl">Less catching up. More showing up.</h2>
            <p className="mt-6 max-w-sm leading-7 text-[#202438]/60">The best productivity system is the one that meets you where you are — even when your brain is already full.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['01', 'See the day', 'A soft landing for your tasks, deadlines, and energy.'],
              ['02', 'Choose a thread', 'Pick one next step instead of holding the whole week.'],
              ['03', 'Keep the loop', 'Small wins build a streak that actually feels like yours.'],
            ].map(([number, title, body]) => (
              <div className="group border-t border-[#202438]/15 pt-4 transition-transform hover:-translate-y-1" key={number}>
                <span className="font-mono-ui text-xs text-[#166b61]">{number}</span>
                <h3 className="mt-12 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#202438]/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="inside" className="bg-[#e6ece4] px-5 py-24 sm:px-8 lg:px-14 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-end gap-10 lg:grid-cols-[1fr_.7fr]">
          <div>
            <p className="font-mono-ui text-[11px] font-medium uppercase tracking-[0.18em] text-[#166b61]">Designed for real semesters</p>
            <h2 className="mt-5 max-w-2xl font-display text-5xl leading-[.98] tracking-[-.04em] sm:text-7xl">Your work, with a little more <em>air</em> around it.</h2>
          </div>
          <div className="lg:pb-2 lg:pl-12"><p className="text-lg leading-8 text-[#202438]/65">A focused dashboard, a place for half-formed thoughts, and a timer that doesn’t make productivity feel like punishment.</p><div className="mt-7"><ArrowLink href="/dashboard">Open your dashboard</ArrowLink></div></div>
        </div>
      </section>

      <footer className="bg-[#f6f0e6] px-5 py-10 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-[#202438]/15 pt-7 text-sm text-[#202438]/55 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <span>Make room for the work that matters.</span>
        </div>
      </footer>
    </main>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-[#202438]/50 lg:hidden" onClick={onClose} aria-label="Close navigation" data-testid="button-close-navigation"><X className="sr-only" /></button>}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col bg-[#202438] px-5 py-6 text-[#f9f4ea] transition-transform duration-300 lg:relative lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between"><Logo dark /><button className="rounded-lg p-2 text-[#f9f4ea]/60 hover:bg-[#f9f4ea]/10 lg:hidden" onClick={onClose} aria-label="Close menu" data-testid="button-close-menu"><X className="size-4" /></button></div>
        <div className="mt-12">
          <p className="px-3 font-mono-ui text-[10px] uppercase tracking-[0.2em] text-[#f9f4ea]/35">Your space</p>
          <nav className="mt-3 space-y-1" aria-label="App navigation">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return <Link key={href} href={href} onClick={onClose} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-[#f9b85b] text-[#202438]' : 'text-[#f9f4ea]/58 hover:bg-[#f9f4ea]/10 hover:text-[#f9f4ea]'}`} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}><Icon className="size-[18px]" /><span>{label}</span>{active && <ChevronRight className="ml-auto size-4" />}</Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4">
          <div className="flex items-center gap-2 text-[#f9b85b]"><Headphones className="size-4" /><span className="font-mono-ui text-[10px] uppercase tracking-widest">A small nudge</span></div>
          <p className="mt-3 text-sm leading-5 text-[#f9f4ea]/75">Progress is allowed to be quiet today.</p>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-[#f9f4ea]/10 pt-5">
          <span className="grid size-9 place-items-center rounded-full bg-[#e6ece4] font-bold text-[#166b61]">AM</span>
          <div><p className="text-sm font-semibold">StudyLoop student</p><p className="text-[11px] text-[#f9f4ea]/45">Personal study workspace</p></div>
        </div>
      </aside>
    </>
  );
}

function ProgressRing({ value }: { value: number }) {
  const radius = 37;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-[102px]">
      <svg className="-rotate-90" width="102" height="102" viewBox="0 0 102 102" aria-label={`${value}% progress`}>
        <circle cx="51" cy="51" r={radius} fill="none" stroke="hsl(222 29% 18% / .1)" strokeWidth="8" />
        <circle cx="51" cy="51" r={radius} fill="none" stroke="#166b61" strokeLinecap="round" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono-ui text-lg font-medium text-[#202438]">{value}%</span>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: number | string) => void | Promise<void> }) {
  const tone = { orange: 'bg-[#f9b85b]', teal: 'bg-[#6aaea2]', plum: 'bg-[#aa91b9]' }[task.tone];
  return (
    <div className={`group flex items-start gap-3 rounded-2xl border border-[#202438]/10 bg-[#fbf8f1] p-4 transition-all hover:border-[#166b61]/35 hover:shadow-sm ${task.completed ? 'opacity-60' : ''}`} data-testid={`task-${task.id}`}>
      <button className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${task.completed ? 'border-[#166b61] bg-[#166b61] text-[#f9f4ea]' : 'border-[#202438]/20 text-transparent hover:border-[#166b61]'}`} onClick={() => onToggle(task.id)} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`} data-testid={`button-toggle-task-${task.id}`}>
        <Check className="size-3.5" strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-bold leading-5 ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#202438]/50"><span className={`size-1.5 rounded-full ${tone}`} /> <span>{task.course}</span><span className="text-[#202438]/20">·</span><span>{task.due}</span></div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href={`/focus?subject=${encodeURIComponent(task.course)}&task=${encodeURIComponent(task.title)}`} className="rounded-full border border-[#202438]/10 px-3 py-1.5 text-[10px] font-bold text-[#166b61] hover:border-[#166b61]" aria-label={`Focus on ${task.title}`}>Focus</Link>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#202438]/45"><Clock3 className="size-3.5" />{task.durationMinutes} min</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData>({ tasks: [], weeklyProgress: 0, streak: 0, upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    apiFetch<DashboardData>('/api/dashboard')
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load your study workspace.'))
      .finally(() => setLoading(false));
  }, []);
  const tasks = dashboard.tasks;
  const completed = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const greeting = useMemo(() => completed === tasks.length && tasks.length > 0 ? 'You made it through the day.' : completed > 0 ? 'Nice pace.' : 'Good morning.', [completed, tasks.length]);
  const toggleTask = async (id: number | string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return;
    const nextCompleted = !current.completed;
    setDashboard((value) => ({ ...value, tasks: value.tasks.map((task) => task.id === id ? { ...task, completed: nextCompleted } : task) }));
    if (typeof id === 'number') {
      try {
        await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ completed: nextCompleted }) });
      } catch {
        setDashboard((value) => ({ ...value, tasks: value.tasks.map((task) => task.id === id ? { ...task, completed: current.completed } : task) }));
      }
    }
  };
  const addTask = async () => {
    if (added) return;
    try {
      const task = await apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify({ title: 'Take a 10 minute reset', course: 'Personal', due: 'Whenever you need it', durationMinutes: 10, tone: 'teal' }) });
      setDashboard((value) => ({ ...value, tasks: [...value.tasks, task] }));
      setAdded(true);
    } catch {
      setError('Could not add that task yet.');
    }
  };
  return (
    <div className="grain flex min-h-[100dvh] bg-[#f6f0e6] text-[#202438]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="relative min-w-0 flex-1 overflow-hidden">
        <div className="dashboard-grid pointer-events-none absolute inset-x-0 top-0 h-[330px] opacity-50" />
        <header className="relative flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
          <button className="rounded-xl border border-[#202438]/10 bg-[#fbf8f1] p-2.5 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="size-5" /></button>
          <div className="hidden lg:block"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#202438]/40">{formatToday()}</p></div>
          <div className="ml-auto flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-xs font-bold">Tuesday energy</span><span className="block text-[11px] text-[#202438]/45">Steady is enough.</span></span><span className="grid size-10 place-items-center rounded-full border-2 border-[#f9b85b] bg-[#e6ece4] text-sm font-extrabold text-[#166b61]">AM</span></div>
        </header>
        <div className="page-enter relative mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
          {error && <p className="mb-4 rounded-xl border border-[#f9b85b]/40 bg-[#f9b85b]/15 px-4 py-3 text-xs font-semibold text-[#8d5b18]">{error}</p>}
          <section className="rise-in flex flex-col justify-between gap-7 border-b border-[#202438]/12 pb-8 pt-7 sm:flex-row sm:items-end sm:pt-12">
            <div><p className="font-mono-ui text-[11px] uppercase tracking-[0.18em] text-[#166b61]">Your day, in view</p><h1 className="mt-3 font-display text-5xl leading-none tracking-[-0.05em] sm:text-6xl">{greeting}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-[#202438]/55">Here’s the shape of your day. Start small, follow the thread, and let the rest become clear.</p></div>
            <div className="flex items-center gap-3"><button className="inline-flex items-center gap-2 rounded-full border border-[#202438]/15 bg-[#fbf8f1] px-4 py-2.5 text-xs font-bold transition-colors hover:border-[#166b61] hover:text-[#166b61] disabled:cursor-not-allowed disabled:opacity-50" onClick={addTask} disabled={added} data-testid="button-add-task"><Plus className="size-4" />{added ? 'Added to today' : 'Add a small task'}</button><Link href="/focus" className="inline-flex items-center gap-2 rounded-full bg-[#202438] px-4 py-2.5 text-xs font-bold text-[#f9f4ea] transition-transform hover:-translate-y-0.5" data-testid="link-start-focus"><Play className="size-3.5 fill-current" />Start focus</Link></div>
          </section>

          <section className="rise-in delay-1 mt-7 grid gap-4 lg:grid-cols-[1.45fr_.8fr_.8fr]">
            <div className="relative overflow-hidden rounded-3xl bg-[#202438] p-6 text-[#f9f4ea] sm:p-7">
              <div className="pointer-events-none absolute -right-7 -top-16 size-48 rounded-full border border-[#f9b85b]/25" /><div className="pointer-events-none absolute -right-1 -top-8 size-32 rounded-full border border-[#f9b85b]/20" />
              <div className="relative flex items-start justify-between gap-6"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#f9b85b]">Today’s loop</p><p className="mt-3 font-display text-4xl leading-none">{completed} <span className="text-[#f9f4ea]/35">/ {tasks.length}</span></p><p className="mt-2 text-sm text-[#f9f4ea]/55">pieces of your day in place</p></div><CheckCircle2 className="size-7 text-[#f9b85b]" /></div>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-[#f9f4ea]/10"><div className="line-draw h-full rounded-full bg-[#f9b85b]" style={{ width: `${percent}%` }} /></div><p className="mt-3 text-xs text-[#f9f4ea]/45">{percent === 100 ? 'Everything is checked off.' : 'One good choice leads to the next.'}</p>
            </div>
            <div className="flex items-center gap-5 rounded-3xl border border-[#202438]/10 bg-[#e6ece4] p-5 sm:p-6"><ProgressRing value={dashboard.weeklyProgress} /><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.15em] text-[#166b61]">This week</p><p className="mt-2 text-sm font-bold">Focus progress</p><p className="mt-1 text-xs leading-5 text-[#202438]/55">You’re building a reliable rhythm.</p></div></div>
            <div className="flex items-start justify-between rounded-3xl border border-[#202438]/10 bg-[#f9b85b] p-5 sm:p-6"><div><Flame className="size-6 text-[#202438]" /><p className="mt-5 font-display text-4xl leading-none">{dashboard.streak}</p><p className="mt-2 text-xs font-bold text-[#202438]/65">day streak</p></div><span className="rounded-full bg-[#202438]/10 px-2 py-1 font-mono-ui text-[10px] text-[#202438]/65">real sessions</span></div>
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1.25fr_.75fr]">
            <div className="rise-in delay-2"><div className="mb-4 flex items-end justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.17em] text-[#202438]/40">The next few steps</p><h2 className="mt-2 font-display text-3xl">Today’s tasks</h2></div><span className="text-xs font-bold text-[#202438]/45">{completed} completed</span></div><div className="space-y-2.5">{tasks.map((task) => <TaskRow key={task.id} task={task} onToggle={(id) => { void toggleTask(id); }} />)}</div></div>
            <div className="rise-in delay-3"><div className="mb-4"><p className="font-mono-ui text-[10px] uppercase tracking-[0.17em] text-[#202438]/40">Keep an eye on</p><h2 className="mt-2 font-display text-3xl">Coming up</h2></div><div className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-5"><div className="space-y-1">{dashboard.upcoming.map((item, index) => <div className="group flex items-center gap-3 border-b border-[#202438]/10 py-4 last:border-0 last:pb-1 first:pt-1" key={item.title}><div className="w-11 shrink-0 text-center"><p className="font-mono-ui text-[9px] text-[#166b61]">{item.day}</p><p className="mt-1 text-xs font-bold">{item.date}</p></div><div className={`h-9 w-1 rounded-full ${item.tone === 'orange' ? 'bg-[#f9b85b]' : item.tone === 'teal' ? 'bg-[#6aaea2]' : 'bg-[#aa91b9]'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.title}</p><p className="mt-1 text-[11px] text-[#202438]/45">{item.relative}</p></div><ChevronRight className="size-4 text-[#202438]/25 transition-transform group-hover:translate-x-1" /></div>)}</div><Link href="/planner" className="mt-4 flex items-center justify-between rounded-xl bg-[#e6ece4] px-3 py-2.5 text-xs font-bold text-[#166b61] transition-colors hover:bg-[#d8e4dc]" data-testid="link-view-planner">View full planner <ArrowUpRight className="size-4" /></Link></div></div>
          </section>

          <section className="rise-in delay-4 mt-10"><div className="mb-4"><p className="font-mono-ui text-[10px] uppercase tracking-[0.17em] text-[#202438]/40">Make it easy</p><h2 className="mt-2 font-display text-3xl">Quick actions</h2></div><div className="grid gap-3 sm:grid-cols-3"><Link href="/assistant" className="group flex items-center gap-4 rounded-2xl border border-[#202438]/10 bg-[#f3dfc3] p-4 transition-all hover:-translate-y-1 hover:shadow-md" data-testid="link-quick-assistant"><span className="grid size-10 place-items-center rounded-xl bg-[#f9f4ea]/70 text-[#a66017]"><Lightbulb className="size-5" /></span><span className="flex-1"><span className="block text-sm font-bold">Ask for a nudge</span><span className="mt-1 block text-xs text-[#202438]/55">Get unstuck in two minutes</span></span><ArrowUpRight className="size-4 text-[#202438]/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link><Link href="/notes" className="group flex items-center gap-4 rounded-2xl border border-[#202438]/10 bg-[#dbe9e3] p-4 transition-all hover:-translate-y-1 hover:shadow-md" data-testid="link-quick-notes"><span className="grid size-10 place-items-center rounded-xl bg-[#f9f4ea]/70 text-[#166b61]"><NotebookPen className="size-5" /></span><span className="flex-1"><span className="block text-sm font-bold">Capture a thought</span><span className="mt-1 block text-xs text-[#202438]/55">Don’t lose the good idea</span></span><ArrowUpRight className="size-4 text-[#202438]/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link><Link href="/planner" className="group flex items-center gap-4 rounded-2xl border border-[#202438]/10 bg-[#e4ddeb] p-4 transition-all hover:-translate-y-1 hover:shadow-md" data-testid="link-quick-planner"><span className="grid size-10 place-items-center rounded-xl bg-[#f9f4ea]/70 text-[#72557d]"><CalendarDays className="size-5" /></span><span className="flex-1"><span className="block text-sm font-bold">Shape the week</span><span className="mt-1 block text-xs text-[#202438]/55">See what’s waiting ahead</span></span><ArrowUpRight className="size-4 text-[#202438]/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link><Link href="/quiz" className="group flex items-center gap-4 rounded-2xl border border-[#202438]/10 bg-[#f3dfc3] p-4 transition-all hover:-translate-y-1 hover:shadow-md" data-testid="link-quick-quiz"><span className="grid size-10 place-items-center rounded-xl bg-[#f9f4ea]/70 text-[#a66017]"><ListChecks className="size-5" /></span><span className="flex-1"><span className="block text-sm font-bold">Test yourself</span><span className="mt-1 block text-xs text-[#202438]/55">Find gaps before the exam does</span></span><ArrowUpRight className="size-4 text-[#202438]/40 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link></div></section>
        </div>
      </main>
    </div>
  );
}

function WorkspacePage({ children, eyebrow, title, description, icon: Icon, accent }: { children: ReactNode; eyebrow: string; title: string; description: string; icon: typeof Compass; accent: string }) {
  const [, setLocation] = useLocation();
  return <div className="grain flex min-h-[100dvh] bg-[#f6f0e6] text-[#202438]"><div className="hidden lg:block"><Sidebar mobileOpen={false} onClose={() => undefined} /></div><main className="min-w-0 flex-1"><header className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12 lg:py-7"><button className="inline-flex items-center gap-2 text-sm font-bold text-[#202438]/60 hover:text-[#202438] lg:hidden" onClick={() => setLocation('/dashboard')}><ChevronRight className="size-4 rotate-180" /> Dashboard</button><div className="lg:hidden"><Logo /></div><p className="hidden font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#202438]/40 lg:block">StudyLoop workspace</p><span className="rounded-full border border-[#202438]/12 px-3 py-1.5 font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#202438]/45">Keep the loop</span></header><div className="page-enter mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-14"><div className="max-w-3xl"><div className={`grid size-14 place-items-center rounded-2xl text-[#202438] ${accent}`}><Icon className="size-6" /></div><p className="mt-7 font-mono-ui text-[11px] uppercase tracking-[0.18em] text-[#166b61]">{eyebrow}</p><h1 className="mt-3 font-display text-5xl leading-[.94] tracking-[-0.05em] sm:text-7xl">{title}</h1><p className="mt-5 max-w-2xl text-base leading-7 text-[#202438]/60 sm:text-lg">{description}</p></div><div className="mt-10">{children}</div></div></main></div>;
}

function PlannerPage() {
  const [form, setForm] = useState({ subject: 'Data Structures', topics: 'Arrays, linked lists, recursion', hoursPerDay: '2', daysUntilExam: '20', difficulty: 'beginner' });
  const [result, setResult] = useState<PlannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try { setResult(await apiFetch<PlannerResult>('/api/planner/generate', { method: 'POST', body: JSON.stringify({ ...form, hoursPerDay: Number(form.hoursPerDay), daysUntilExam: Number(form.daysUntilExam) }) })); } finally { setLoading(false); }
  };
  return <WorkspacePage eyebrow="AI study planner" title="Make the week feel lighter." description="Tell StudyLoop what is ahead, how much time you have, and where the topic feels difficult. You’ll get a right-sized plan instead of a perfect one." icon={CalendarDays} accent="bg-[#f9b85b]"><div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]"><form onSubmit={generate} className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-[#202438]/10 pb-5"><span className="grid size-9 place-items-center rounded-full bg-[#f3dfc3] text-[#a66017]"><Sparkles className="size-4" /></span><div><p className="text-sm font-bold">Build your next loop</p><p className="mt-1 text-xs text-[#202438]/50">A plan you can actually start.</p></div></div><div className="mt-6 space-y-4"><label className="block text-xs font-bold">Subject<input value={form.subject} onChange={(event) => update('subject', event.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none focus:border-[#166b61]" required /></label><label className="block text-xs font-bold">Topics<textarea value={form.topics} onChange={(event) => update('topics', event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none focus:border-[#166b61]" required /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold">Hours / day<input type="number" min="0.5" step="0.5" value={form.hoursPerDay} onChange={(event) => update('hoursPerDay', event.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none" /></label><label className="block text-xs font-bold">Days until exam<input type="number" min="1" value={form.daysUntilExam} onChange={(event) => update('daysUntilExam', event.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none" /></label></div><label className="block text-xs font-bold">Difficulty<select value={form.difficulty} onChange={(event) => update('difficulty', event.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none"><option value="beginner">I’m just starting</option><option value="intermediate">I know the basics</option><option value="advanced">I want a challenge</option></select></label></div><button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#202438] px-5 py-3.5 text-sm font-bold text-[#f9f4ea] disabled:opacity-60" disabled={loading}>{loading ? 'Thinking through your week…' : 'Generate my study plan'}<ArrowRight className="size-4" /></button></form><div className="rounded-3xl bg-[#202438] p-5 text-[#f9f4ea] sm:p-7">{!result ? <div className="flex min-h-[420px] flex-col justify-end"><div className="grid size-12 place-items-center rounded-2xl bg-[#f9b85b] text-[#202438]"><Compass className="size-6" /></div><h2 className="mt-8 max-w-md font-display text-4xl leading-none sm:text-5xl">A good plan gives your attention somewhere to land.</h2><p className="mt-5 max-w-md text-sm leading-6 text-[#f9f4ea]/55">Fill in the left side and StudyLoop will turn the big topic into a few clear next steps.</p></div> : <div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#f9b85b]">Your plan</p><h2 className="mt-3 font-display text-4xl leading-none">{result.title}</h2><p className="mt-4 text-sm leading-6 text-[#f9f4ea]/65">{result.overview}</p><div className="mt-7 space-y-2.5">{result.days.map((day) => <div key={`${day.day}-${day.focus}`} className="rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#f9b85b]">{day.day} · {day.minutes} min</p><p className="mt-1 text-sm font-bold">{day.focus}</p></div><CheckCircle2 className="size-4 text-[#6aaea2]" /></div><p className="mt-2 text-xs leading-5 text-[#f9f4ea]/55">{day.action}</p></div>)}</div><div className="mt-7 border-t border-[#f9f4ea]/10 pt-5"><p className="text-xs font-bold text-[#f9b85b]">Three small reminders</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[#f9f4ea]/65">{result.tips.slice(0, 3).map((tip) => <li key={tip}>• {tip}</li>)}</ul></div></div>}</div></div></WorkspacePage>;
}

function RecoveryPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecoveryResult | null>(null);
  const [error, setError] = useState('');
  const replan = async () => {
    setLoading(true); setError('');
    try { setResult(await apiFetch<RecoveryResult>('/api/adaptive/replan', { method: 'POST', body: JSON.stringify({}) })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not rebuild your plan.'); }
    finally { setLoading(false); }
  };
  return <WorkspacePage eyebrow="Adaptive recovery loop" title="Plans should change when real life does." description="StudyLoop looks at unfinished work and recent focus time, then rebuilds the next two days around what you can realistically do. No guilt. Just the next useful move." icon={RefreshCw} accent="bg-[#dbe9e3] text-[#166b61]">
    <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-6 sm:p-7">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e6ece4] text-[#166b61]"><Target className="size-5" /></span><div><p className="text-sm font-bold">Study Reality Check</p><p className="text-xs text-[#202438]/50">Use your actual workload, not a perfect timetable.</p></div></div>
        <div className="mt-7 rounded-2xl bg-[#202438] p-5 text-[#f9f4ea]"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#f9b85b]">The loop</p><p className="mt-3 text-sm leading-6 text-[#f9f4ea]/70">Missed work becomes input. Quiz mistakes become input. Focus time becomes input. The next plan adapts.</p></div>
        <button onClick={replan} disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#202438] px-5 py-3.5 text-sm font-bold text-[#f9f4ea] disabled:opacity-60">{loading ? 'Rebuilding your next two days…' : 'I’m behind — rebuild my plan'}<RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
        {error && <p className="mt-4 rounded-xl bg-[#f9b85b]/15 px-3 py-2.5 text-xs font-semibold text-[#8d5b18]">{error}</p>}
      </div>
      <div className="rounded-3xl bg-[#202438] p-6 text-[#f9f4ea] sm:p-7">
        {!result ? <div className="flex min-h-[390px] flex-col justify-end"><TrendingUp className="size-8 text-[#f9b85b]" /><h2 className="mt-6 font-display text-4xl leading-none sm:text-5xl">Your plan should follow your reality.</h2><p className="mt-5 max-w-md text-sm leading-6 text-[#f9f4ea]/55">Press the button after missing a session or falling behind. StudyLoop will use your current tasks and focus history to suggest the smallest useful recovery path.</p></div> : <div>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#f9b85b]">{result.status === 'recovery' ? 'Recovery mode' : 'On track'}</p><h2 className="mt-3 font-display text-4xl leading-none">{result.headline}</h2></div><div className="grid size-20 place-items-center rounded-full border-4 border-[#f9b85b] text-center"><span><span className="block font-mono-ui text-xl">{result.realityScore}</span><span className="text-[8px] uppercase tracking-widest text-[#f9f4ea]/45">reality</span></span></div></div>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#f9b85b]" /><p className="text-xs leading-5 text-[#f9f4ea]/65">{result.diagnosis}</p></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{[['Today', result.today], ['Tomorrow', result.tomorrow]].map(([label, items]) => <div key={String(label)} className="rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#f9b85b]">{String(label)}</p><div className="mt-3 space-y-2">{(items as RecoveryItem[]).map((item) => <div key={`${label}-${item.title}`} className="rounded-xl bg-[#202438] p-3"><div className="flex justify-between gap-2"><p className="text-xs font-bold">{item.title}</p><span className="font-mono-ui text-[10px] text-[#6aaea2]">{item.minutes}m</span></div><p className="mt-1 text-[10px] leading-4 text-[#f9f4ea]/45">{item.reason}</p></div>)}</div></div>)}</div>
          <div className="mt-6 border-t border-[#f9f4ea]/10 pt-5"><p className="text-xs font-bold text-[#f9b85b]">Adaptive rule</p><p className="mt-2 text-xs leading-5 text-[#f9f4ea]/60">{result.rule}</p></div>
        </div>}
      </div>
    </div>
  </WorkspacePage>;
}

function AssistantPage() {
  const [question, setQuestion] = useState('Explain recursion like I’m a beginner.');
  const [mode, setMode] = useState<'explain' | 'summarize' | 'practice'>('explain');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [loading, setLoading] = useState(false);
  const ask = async (event: React.FormEvent) => { event.preventDefault(); if (!question.trim()) return; setLoading(true); try { setResult(await apiFetch<AssistantResult>('/api/assistant/ask', { method: 'POST', body: JSON.stringify({ question, mode }) })); } finally { setLoading(false); } };
  return <WorkspacePage eyebrow="AI study assistant" title="A thought partner, not another tab." description="Bring the half-formed question, the stuck paragraph, or the foggy plan. StudyLoop will help you find a way in." icon={BrainCircuit} accent="bg-[#dbe9e3] text-[#166b61]"><div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><form onSubmit={ask} className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#dbe9e3] text-[#166b61]"><Lightbulb className="size-5" /></span><div><p className="text-sm font-bold">What are you working through?</p><p className="mt-1 text-xs text-[#202438]/50">No question is too basic.</p></div></div><textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-6 min-h-40 w-full rounded-2xl border border-[#202438]/12 bg-[#f6f0e6] p-4 text-sm leading-6 outline-none focus:border-[#166b61]" /><div className="mt-4 grid grid-cols-3 gap-2">{(['explain', 'summarize', 'practice'] as const).map((item) => <button type="button" key={item} onClick={() => setMode(item)} className={`rounded-xl border px-2 py-2.5 text-[11px] font-bold capitalize ${mode === item ? 'border-[#166b61] bg-[#dbe9e3] text-[#166b61]' : 'border-[#202438]/10'}`}>{item}</button>)}</div><button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#202438] px-5 py-3.5 text-sm font-bold text-[#f9f4ea] disabled:opacity-60" disabled={loading}>{loading ? 'Working through it…' : 'Ask StudyLoop'}<ArrowRight className="size-4" /></button></form><div className="rounded-3xl border border-[#202438]/10 bg-[#e6ece4] p-5 sm:p-7">{result ? <div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#166b61]">A clearer way in</p><p className="mt-5 text-lg leading-8">{result.answer}</p><div className="mt-8 border-t border-[#202438]/10 pt-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#166b61]">Keep these close</p><ul className="mt-3 space-y-2 text-sm leading-6">{result.takeaways.map((item) => <li className="flex gap-2" key={item}><Check className="mt-1 size-4 shrink-0 text-[#166b61]" />{item}</li>)}</ul></div><div className="mt-8 rounded-2xl bg-[#fbf8f1] p-4"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#a66017]">Try this next</p><p className="mt-2 text-sm font-semibold leading-6">{result.practiceQuestion}</p></div></div> : <div className="flex min-h-[420px] flex-col justify-end"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#166b61]">A little less stuck</p><h2 className="mt-4 font-display text-5xl leading-none">Start with the question you’re avoiding.</h2><p className="mt-5 text-sm leading-6 text-[#202438]/55">You’ll get a simple explanation, a few takeaways, and one small way to practice.</p></div>}</div></div></WorkspacePage>;
}

function QuizPage() {
  type QuizQuestion = { question: string; options: string[]; correctIndex: number; explanation: string; topic: string };
  type QuizResult = { title: string; questions: QuizQuestion[] };
  type GradeResult = { score: number; total: number; percentage: number; headline: string; feedback: string; nextStep: string; weakTopics: string[]; missed: Array<{ question: string; correctAnswer: string; explanation: string; topic: string }> };
  const [form, setForm] = useState({ subject: 'C Programming', topics: 'loops, arrays, pointers', difficulty: 'beginner' });
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setGrade(null);
    try {
      const next = await apiFetch<QuizResult>('/api/quiz/generate', { method: 'POST', body: JSON.stringify({ ...form, count: 5 }) });
      setQuiz(next); setAnswers(Array(next.questions.length).fill(-1));
    } finally { setLoading(false); }
  };
  const submit = async () => {
    if (!quiz || answers.some((answer) => answer < 0)) return;
    setLoading(true);
    try { setGrade(await apiFetch<GradeResult>('/api/quiz/grade', { method: 'POST', body: JSON.stringify({ questions: quiz.questions, answers }) })); } finally { setLoading(false); }
  };
  return <WorkspacePage eyebrow="AI quiz lab" title="Turn reading into recall." description="Most students can recognize an answer after seeing it. Quiz Lab makes you retrieve it first, then shows exactly what to revise." icon={ListChecks} accent="bg-[#f3dfc3] text-[#a66017]"><div className="grid gap-5 lg:grid-cols-[.72fr_1.28fr]">
    <form onSubmit={generate} className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-[#202438]/10 pb-5"><span className="grid size-10 place-items-center rounded-xl bg-[#f3dfc3] text-[#a66017]"><Sparkles className="size-5" /></span><div><p className="text-sm font-bold">Build a 5-question check</p><p className="mt-1 text-xs text-[#202438]/50">AI targets understanding and common mistakes.</p></div></div><div className="mt-6 space-y-4"><label className="block text-xs font-bold">Subject<input value={form.subject} onChange={(e) => update('subject', e.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none focus:border-[#166b61]" required /></label><label className="block text-xs font-bold">Topics<textarea value={form.topics} onChange={(e) => update('topics', e.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none focus:border-[#166b61]" required /></label><label className="block text-xs font-bold">Difficulty<select value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} className="mt-2 w-full rounded-xl border border-[#202438]/12 bg-[#f6f0e6] px-3.5 py-3 text-sm outline-none"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Challenge</option></select></label></div><button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#202438] px-5 py-3.5 text-sm font-bold text-[#f9f4ea] disabled:opacity-60" disabled={loading}>{loading ? 'Building your check…' : 'Generate quiz'}<ArrowRight className="size-4" /></button><p className="mt-4 text-[11px] leading-5 text-[#202438]/45">Best workflow: attempt every question before opening your notes.</p></form>
    <div className="rounded-3xl bg-[#202438] p-5 text-[#f9f4ea] sm:p-7">{grade ? <div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#f9b85b]">Your result</p><div className="mt-4 flex items-end gap-3"><span className="font-display text-6xl leading-none">{grade.percentage}%</span><span className="pb-1 text-sm text-[#f9f4ea]/55">{grade.score}/{grade.total} correct</span></div><h2 className="mt-6 font-display text-3xl">{grade.headline}</h2><p className="mt-3 text-sm leading-6 text-[#f9f4ea]/65">{grade.feedback}</p><div className="mt-6 rounded-2xl bg-[#2c3045] p-4"><p className="text-xs font-bold text-[#f9b85b]">Next best move</p><p className="mt-2 text-sm leading-6 text-[#f9f4ea]/75">{grade.nextStep}</p></div>{grade.weakTopics.length > 0 && <div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f9b85b]">Gaps to revisit</p><div className="mt-3 flex flex-wrap gap-2">{grade.weakTopics.map((topic) => <span key={topic} className="rounded-full bg-[#f9f4ea]/10 px-3 py-1.5 text-xs">{topic}</span>)}</div></div>}{grade.missed.length > 0 && <div className="mt-6 space-y-2">{grade.missed.map((item) => <div key={item.question} className="rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4"><p className="text-xs font-bold">{item.question}</p><p className="mt-2 text-xs text-[#6aaea2]">Correct: {item.correctAnswer}</p><p className="mt-1 text-xs leading-5 text-[#f9f4ea]/55">{item.explanation}</p></div>)}</div>}<button onClick={() => { setGrade(null); setQuiz(null); }} className="mt-6 rounded-full bg-[#f9b85b] px-5 py-3 text-sm font-bold text-[#202438]">Try another check</button></div> : quiz ? <div><div className="flex items-start justify-between gap-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#f9b85b]">Active recall</p><h2 className="mt-2 font-display text-3xl">{quiz.title}</h2></div><span className="rounded-full bg-[#f9f4ea]/10 px-3 py-1 text-[10px]">{quiz.questions.length} questions</span></div><div className="mt-7 space-y-4">{quiz.questions.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-2xl border border-[#f9f4ea]/10 bg-[#2c3045] p-4"><p className="text-sm font-bold leading-6"><span className="mr-2 text-[#f9b85b]">{index + 1}.</span>{item.question}</p><div className="mt-3 grid gap-2">{item.options.map((option, optionIndex) => <button type="button" key={option} onClick={() => setAnswers((current) => current.map((answer, i) => i === index ? optionIndex : answer))} className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${answers[index] === optionIndex ? 'border-[#f9b85b] bg-[#f9b85b]/15 text-[#f9f4ea]' : 'border-[#f9f4ea]/10 text-[#f9f4ea]/65 hover:border-[#f9f4ea]/25'}`}>{option}</button>)}</div></div>)}</div><button onClick={submit} disabled={loading || answers.some((answer) => answer < 0)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#f9b85b] px-5 py-3.5 text-sm font-extrabold text-[#202438] disabled:opacity-40">{loading ? 'Checking your answers…' : 'Finish & find my gaps'}<CheckCircle2 className="size-4" /></button></div> : <div className="flex min-h-[430px] flex-col justify-end"><div className="grid size-12 place-items-center rounded-2xl bg-[#f9b85b] text-[#202438]"><ListChecks className="size-6" /></div><h2 className="mt-8 max-w-md font-display text-4xl leading-none sm:text-5xl">Don’t just feel ready. Check it.</h2><p className="mt-5 max-w-md text-sm leading-6 text-[#f9f4ea]/55">StudyLoop turns your topic into a short exam-style check and points you toward the gaps worth revising.</p></div>}</div></div></WorkspacePage>;
}

function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState<NoteSummary | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => { apiFetch<Note[]>('/api/notes').then((items) => { setNotes(items); if (items[0]) { setActiveId(items[0].id); setTitle(items[0].title); setContent(items[0].content); setSummary(items[0].summary ? { summary: items[0].summary, keyPoints: items[0].keyPoints } : null); } }); }, []);
  const selectNote = (note: Note) => { setActiveId(note.id); setTitle(note.title); setContent(note.content); setSummary(note.summary ? { summary: note.summary, keyPoints: note.keyPoints } : null); setMessage(''); };
  const newNote = () => { setActiveId(null); setTitle(''); setContent(''); setSummary(null); setMessage(''); };
  const saveNote = async () => { if (!title.trim()) return; const saved = activeId ? await apiFetch<Note>(`/api/notes/${activeId}`, { method: 'PATCH', body: JSON.stringify({ title, content }) }) : await apiFetch<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ title, content }) }); setNotes((current) => activeId ? current.map((note) => note.id === saved.id ? saved : note) : [saved, ...current]); setActiveId(saved.id); setMessage('Saved just now'); };
  const summarize = async () => { if (!content.trim()) return; const next = await apiFetch<NoteSummary>('/api/notes/summarize', { method: 'POST', body: JSON.stringify({ content }) }); setSummary(next); if (activeId) { const saved = await apiFetch<Note>(`/api/notes/${activeId}`, { method: 'PATCH', body: JSON.stringify({ summary: next.summary, keyPoints: next.keyPoints }) }); setNotes((current) => current.map((note) => note.id === saved.id ? saved : note)); } setMessage('Summary ready'); };
  const deleteNote = async () => { if (!activeId) return; await apiFetch(`/api/notes/${activeId}`, { method: 'DELETE' }); setNotes((current) => current.filter((note) => note.id !== activeId)); newNote(); setMessage('Note deleted'); };
  return <WorkspacePage eyebrow="Smart notes" title="Keep the good thoughts close." description="Save lecture fragments, bright ideas, and the connection you almost forgot to write down. StudyLoop can turn the rough version into something useful for revision." icon={NotebookPen} accent="bg-[#e4ddeb] text-[#72557d]"><div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><div className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-4 sm:p-5"><div className="flex items-center justify-between"><p className="font-mono-ui text-[10px] uppercase tracking-[0.18em] text-[#166b61]">Your notes</p><button onClick={newNote} className="inline-flex items-center gap-1.5 rounded-full bg-[#202438] px-3 py-2 text-[11px] font-bold text-[#f9f4ea]"><Plus className="size-3.5" /> New</button></div><div className="mt-4 space-y-2">{notes.map((note) => <button key={note.id} onClick={() => selectNote(note)} className={`w-full rounded-2xl border p-3 text-left ${activeId === note.id ? 'border-[#166b61]/40 bg-[#dbe9e3]' : 'border-[#202438]/10'}`}><p className="truncate text-sm font-bold">{note.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#202438]/50">{note.content}</p></button>)}</div></div><div className="rounded-3xl border border-[#202438]/10 bg-[#fbf8f1] p-5 sm:p-7"><div className="flex flex-col gap-3 border-b border-[#202438]/10 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled note" className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-[#202438]/25" /><p className="mt-1 text-xs text-[#202438]/45">{message || 'A place to think on paper.'}</p></div><div className="flex gap-2"><button onClick={summarize} className="inline-flex items-center gap-1.5 rounded-full border border-[#202438]/15 px-3 py-2 text-[11px] font-bold hover:border-[#166b61] hover:text-[#166b61]"><Sparkles className="size-3.5" /> Summarize</button><button onClick={saveNote} className="rounded-full bg-[#202438] px-4 py-2 text-[11px] font-bold text-[#f9f4ea]">Save note</button></div></div><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Write the rough version here…" className="mt-6 min-h-56 w-full resize-y bg-transparent text-base leading-8 outline-none placeholder:text-[#202438]/30" />{summary && <div className="mt-5 rounded-2xl bg-[#e6ece4] p-4"><p className="font-mono-ui text-[10px] uppercase tracking-[0.16em] text-[#166b61]">AI revision sheet</p><p className="mt-2 text-sm leading-6">{summary.summary}</p><ul className="mt-3 space-y-1 text-xs leading-5 text-[#202438]/65">{summary.keyPoints.map((point) => <li key={point}>• {point}</li>)}</ul></div>}{activeId && <button onClick={deleteNote} className="mt-5 text-xs font-bold text-[#a66017] hover:underline">Delete this note</button>}</div></div></WorkspacePage>;
}

function FocusPage() {
  const [duration, setDuration] = useState(25 * 60);
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [subject, setSubject] = useState(() => new URLSearchParams(window.location.search).get('subject') || 'Data Structures');
  const taskTitle = new URLSearchParams(window.location.search).get('task') || '';
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const saveSession = async (elapsed: number) => {
    if (saved || elapsed < 60) return;
    const minutes = Math.floor(elapsed / 60);
    try {
      await apiFetch('/api/study-sessions', { method: 'POST', body: JSON.stringify({ minutes, subject: subject.trim() || 'General study' }) });
      setSaved(true);
      setMessage(`${minutes} minute session logged.`);
    } catch {
      setMessage('Session finished, but could not sync yet.');
    }
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setRunning(false);
          void saveSession(duration);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, duration]);

  const reset = () => {
    setRunning(false);
    setSeconds(duration);
    setSaved(false);
    setMessage('');
  };

  const chooseDuration = (minutes: number) => {
    setDuration(minutes * 60);
    setSeconds(minutes * 60);
    setRunning(false);
    setSaved(false);
    setMessage('');
  };

  return <WorkspacePage eyebrow="Focus room" title="One thing. A little time." description="A focus room with enough structure to begin and enough quiet to keep going. Set the timer, then let the rest wait." icon={Timer} accent="bg-[#f3dfc3] text-[#a66017]"><div className="mx-auto max-w-3xl rounded-[32px] bg-[#202438] p-6 text-[#f9f4ea] sm:p-10"><div className="flex flex-col items-center text-center"><p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-[#f9b85b]">Your next quiet session</p><div className="mt-9 font-mono-ui text-8xl font-medium tracking-[-0.08em] sm:text-[10rem]">{String(Math.floor(seconds / 60)).padStart(2, '0')}<span className="text-[#f9b85b]">:</span>{String(seconds % 60).padStart(2, '0')}</div>{taskTitle && <p className="mt-5 max-w-xl text-sm font-semibold text-[#f9f4ea]/70">Task: {taskTitle}</p>}<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-5 rounded-full border border-[#f9f4ea]/15 bg-[#2c3045] px-4 py-2 text-center text-sm outline-none" aria-label="Focus subject" /><div className="mt-7 flex flex-wrap justify-center gap-2">{[1, 5, 25, 50].map((item) => <button key={item} onClick={() => chooseDuration(item)} className={`rounded-full px-3 py-2 text-xs font-bold ${duration === item * 60 ? 'bg-[#f9b85b] text-[#202438]' : 'border border-[#f9f4ea]/15 text-[#f9f4ea]/65'}`}>{item} min</button>)}</div><div className="mt-8 flex items-center gap-3"><button onClick={() => setRunning((value) => !value)} disabled={saved} className="inline-flex items-center gap-2 rounded-full bg-[#f9b85b] px-6 py-3.5 text-sm font-extrabold text-[#202438] disabled:opacity-50">{running ? 'Pause focus' : saved ? 'Session logged' : 'Start focus'}<Play className={`size-4 ${running || saved ? 'hidden' : 'fill-current'}`} /></button><button onClick={reset} className="rounded-full border border-[#f9f4ea]/20 px-5 py-3.5 text-sm font-bold text-[#f9f4ea]/75">Reset</button></div>{message && <p className="mt-5 text-xs font-semibold text-[#6aaea2]">{message}</p>}<p className="mt-9 max-w-md text-xs leading-5 text-[#f9f4ea]/45">Only completed focus time is counted. Pausing does not inflate your study statistics.</p></div></div></WorkspacePage>;
}

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/planner" component={PlannerPage} />
        <Route path="/assistant" component={AssistantPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/notes" component={NotesPage} />
        <Route path="/focus" component={FocusPage} />
        <Route path="/recovery" component={RecoveryPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;