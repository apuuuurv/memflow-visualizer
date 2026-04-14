import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Cpu,
  Database,
  Info,
  LayoutDashboard,
  MoonStar,
  Play,
  SkipForward,
  Sparkles,
  SunMedium,
  Target,
  TrendingUp,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/simulate";
const FIFO_ANOMALY_PAGES = "1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5";
const THEME_KEY = "memflow-theme";

const algorithmMeta = {
  fifo: { label: "FIFO", summary: "Evicts the oldest page in memory first.", accent: "from-sky-500 to-blue-600", stroke: "#3b82f6" },
  lru: { label: "LRU", summary: "Replaces the page that was used least recently.", accent: "from-violet-500 to-indigo-600", stroke: "#8b5cf6" },
  optimal: { label: "Optimal", summary: "Looks ahead and replaces the page used farthest in the future.", accent: "from-emerald-500 to-teal-500", stroke: "#10b981" },
};

const quickSamples = [
  { label: "Classic", pages: "7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2", capacity: 3 },
  { label: "Looping", pages: "1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5", capacity: 4 },
  { label: "Burst", pages: "2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2", capacity: 3 },
  { label: "FIFO Anomaly Demo", pages: FIFO_ANOMALY_PAGES, capacity: 3, anomaly: true },
];

function parsePages(value) {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => !Number.isNaN(item));
}

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") {
    return saved;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function buildFaultChartData(results, revealedStepCount) {
  if (!results || revealedStepCount === 0) {
    return [];
  }

  const totalSteps = Math.max(
    results.fifo.steps.length,
    results.lru.steps.length,
    results.optimal.steps.length,
  );

  return Array.from({ length: Math.min(revealedStepCount, totalSteps) }, (_, index) => ({
    step: `T${index + 1}`,
    fifo: results.fifo.steps.slice(0, index + 1).filter((step) => step.status === "Miss").length,
    lru: results.lru.steps.slice(0, index + 1).filter((step) => step.status === "Miss").length,
    optimal: results.optimal.steps.slice(0, index + 1).filter((step) => step.status === "Miss").length,
  }));
}

function buildInsightSummary(results) {
  if (!results) {
    return "";
  }

  const ranking = Object.entries(results).sort(([, left], [, right]) => left.faults - right.faults);
  const [winnerKey, winnerResult] = ranking[0];
  const [runnerUpKey, runnerUpResult] = ranking[1];
  const [thirdKey, thirdResult] = ranking[2];
  const closeGap = runnerUpResult.faults - winnerResult.faults;
  const localityComment =
    closeGap <= 2
      ? `${algorithmMeta[runnerUpKey].label} was very close (${runnerUpResult.faults} faults), indicating high temporal locality.`
      : `${algorithmMeta[runnerUpKey].label} trailed with ${runnerUpResult.faults} faults, showing some locality but less efficient replacement choices.`;

  return `For this reference string, ${algorithmMeta[winnerKey].label} was the winner (${winnerResult.faults} faults). ${localityComment} ${algorithmMeta[thirdKey].label} struggled (${thirdResult.faults} faults) due to its simpler replacement policy.`;
}

function chartTooltipStyle(theme) {
  return {
    backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.96)",
    border: theme === "dark" ? "1px solid rgba(71,85,105,0.55)" : "1px solid rgba(203,213,225,0.9)",
    borderRadius: "18px",
    boxShadow: "0 20px 50px -30px rgba(15,23,42,0.55)",
    color: theme === "dark" ? "#e2e8f0" : "#0f172a",
  };
}

function RevealedStatCard({ algoKey, metrics, totalRevealed, winnerKey }) {
  const meta = algorithmMeta[algoKey];
  const isWinner = winnerKey === algoKey;
  const faultPercent = totalRevealed > 0 ? (metrics.faults / totalRevealed) * 100 : 0;

  return (
    <div className={`soft-card relative overflow-hidden rounded-[28px] p-5 transition-all ${isWinner ? "ring-2 ring-emerald-500/50" : ""}`}>
      {isWinner && (
        <div className="absolute right-3 top-3 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
          Leading
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <div className={`rounded-xl bg-gradient-to-br p-2.5 text-white ${meta.accent}`}>
          <Activity size={18} />
        </div>
        <div>
          <p className="eyebrow">{meta.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--text-strong)]">{metrics.faults}</span>
            <span className="text-xs text-[var(--text-soft)]">accumulated faults</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-[var(--text-soft)]">Workload Strain</span>
            <span className="text-[var(--text-strong)]">{Math.round(faultPercent)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${faultPercent}%` }}
              className={`h-full bg-gradient-to-r ${meta.accent}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-muted)] px-4 py-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-500" />
            <span className="text-xs font-semibold text-[var(--text-strong)]">Efficiency</span>
          </div>
          <span className="text-sm font-bold text-emerald-500">{metrics.hitRate}%</span>
        </div>
      </div>
    </div>
  );
}

function getChartPalette(theme) {
  return theme === "dark"
    ? {
        grid: "#243244",
        text: "#94a3b8",
        tooltipBg: "rgba(15, 23, 42, 0.95)",
      }
    : {
        grid: "#dbe4ee",
        text: "#64748b",
        tooltipBg: "rgba(255, 255, 255, 0.96)",
      };
}

function StatCard({ algoKey, result, activeAlgo, setActiveAlgo }) {
  const meta = algorithmMeta[algoKey];

  return (
    <button
      type="button"
      onClick={() => setActiveAlgo(algoKey)}
      className={`stat-card group rounded-[28px] border p-5 text-left transition-all ${activeAlgo === algoKey ? "ring-2 ring-[var(--accent-soft)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{meta.label}</p>
          <h3 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">{result.faults}</h3>
          <p className="mt-1 text-sm text-[var(--text-soft)]">Page faults</p>
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${meta.accent}`}>
          <Database size={20} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="soft-tile rounded-2xl px-3 py-2">
          <p className="eyebrow">Hits</p>
          <p className="mt-1 font-semibold text-[var(--text-strong)]">{result.hits}</p>
        </div>
        <div className="soft-tile rounded-2xl px-3 py-2">
          <p className="eyebrow">Hit Rate</p>
          <p className="mt-1 font-semibold text-[var(--text-strong)]">{result.hitRate}%</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--text-soft)]">
        <span>{meta.summary}</span>
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function TimelineStep({ step, stepIndex, totalFrames, isNewest }) {
  return (
    <motion.div
      layout
      initial={isNewest ? { opacity: 0, y: 28 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="timeline-card w-[152px] flex-shrink-0 rounded-[30px] border p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow">T{stepIndex + 1}</span>
        <div className="flex items-center gap-1.5">
          {step.status === "Miss" ? (
            <div className="group relative">
              <span className="inline-flex rounded-full bg-[var(--surface-muted)] p-1 text-[var(--text-soft)]">
                <Info size={12} />
              </span>
              <div className="pointer-events-none absolute right-0 top-7 z-20 w-56 rounded-2xl bg-[var(--tooltip-bg)] px-3 py-2 text-xs leading-5 text-[var(--tooltip-text)] opacity-0 shadow-xl transition group-hover:opacity-100">
                {step.explanation}
              </div>
            </div>
          ) : null}
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${step.status === "Hit" ? "badge-hit" : "badge-miss"}`}>
            {step.status}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-[var(--text-soft)]">Ref page</span>
        <span className="rounded-2xl bg-[var(--chip-bg)] px-3 py-1 text-sm font-semibold text-[var(--chip-text)]">
          {step.page}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {Array.from({ length: totalFrames }).map((_, frameIndex) => {
          const isInserted = step.status === "Miss" && step.insertedIndex === frameIndex;
          const isVictim = step.status === "Miss" && step.evictedIndex === frameIndex;
          const frameValue = step.memory[frameIndex];
          const victimValue = step.beforeMemory?.[frameIndex];

          return (
            <motion.div
              key={`${stepIndex}-${frameIndex}`}
              layout
              initial={false}
              animate={
                isNewest && isVictim
                  ? { scale: [1, 0.98, 1], borderColor: ["var(--danger-border)", "var(--danger)", "var(--danger-border)"] }
                  : isNewest && isInserted
                    ? { y: [-6, 0], opacity: [0.7, 1] }
                    : {}
              }
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={`min-h-14 rounded-2xl border px-3 py-2 text-sm ${
                isVictim ? "cell-victim" : isInserted ? "cell-inserted" : frameValue !== null ? "cell-filled" : "cell-empty"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--text-faint)]">
                  F{frameIndex + 1}
                </span>
                {isVictim ? (
                  <span className="rounded-full bg-[var(--danger-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">
                    Victim
                  </span>
                ) : isInserted ? (
                  <span className="rounded-full bg-[var(--warn-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warn)]">
                    New
                  </span>
                ) : null}
              </div>

              {isVictim && victimValue !== null ? (
                <div className="mt-2 space-y-1">
                  <motion.div
                    initial={false}
                    animate={isNewest ? { opacity: [1, 0.8], textDecorationThickness: ["0px", "2px"] } : {}}
                    transition={{ duration: 0.35 }}
                    className="font-semibold text-[var(--danger)] line-through"
                  >
                    {victimValue}
                  </motion.div>
                  <motion.div
                    initial={isNewest ? { y: -10, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.08 }}
                    className="font-semibold text-[var(--text-strong)]"
                  >
                    {frameValue ?? "-"}
                  </motion.div>
                </div>
              ) : (
                <motion.div
                  initial={isNewest && isInserted ? { y: -10, opacity: 0 } : false}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="mt-2 font-semibold text-[var(--text-strong)]"
                >
                  {frameValue ?? "-"}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-[var(--text-soft)]">
        {step.status === "Miss" && step.replacedPage !== null
          ? `Replaced ${step.replacedPage}`
          : step.status === "Miss"
            ? "Loaded into empty frame"
            : "No replacement needed"}
      </div>
    </motion.div>
  );
}

export default function App() {
  const [pages, setPages] = useState("7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2");
  const [capacity, setCapacity] = useState(3);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeAlgo, setActiveAlgo] = useState("fifo");
  const [error, setError] = useState("");
  const [revealedStepCount, setRevealedStepCount] = useState(0);
  const [compareAnomaly, setCompareAnomaly] = useState(false);
  const [anomalyResults, setAnomalyResults] = useState(null);
  const [theme, setTheme] = useState(getInitialTheme);

  const timelineRef = useRef(null);
  const latestStepRef = useRef(null);

  const parsedPages = useMemo(() => parsePages(pages), [pages]);
  const activeResult = results?.[activeAlgo];
  const visibleSteps = activeResult?.steps.slice(0, revealedStepCount) ?? [];
  const insightSummary = useMemo(() => buildInsightSummary(results), [results]);
  const hasMoreSteps = activeResult ? revealedStepCount < activeResult.steps.length : false;

  const revealedMetrics = useMemo(() => {
    if (!results || revealedStepCount === 0) return null;
    const metrics = {};
    let minFaults = Number.POSITIVE_INFINITY;
    let winner = null;

    for (const [key, res] of Object.entries(results)) {
      const revealedSteps = res.steps.slice(0, revealedStepCount);
      const faults = revealedSteps.filter((s) => s.status === "Miss").length;
      const hits = revealedSteps.length - faults;
      const hitRate = revealedSteps.length ? ((hits / revealedSteps.length) * 100).toFixed(1) : 0;
      metrics[key] = { faults, hits, hitRate };
      
      if (faults < minFaults) {
        minFaults = faults;
        winner = key;
      }
    }
    return { metrics, winner };
  }, [results, revealedStepCount]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!latestStepRef.current || !timelineRef.current) {
      return;
    }

    latestStepRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [revealedStepCount, activeAlgo]);

  async function runSimulation() {
    if (!parsedPages.length) {
      setError("Enter at least one valid page reference.");
      return;
    }

    const parsedCapacity = Number.parseInt(capacity, 10);
    if (Number.isNaN(parsedCapacity) || parsedCapacity < 1) {
      setError("Frame capacity must be at least 1.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(API_URL, {
        pages: parsedPages,
        capacity: parsedCapacity,
      });

      setResults(response.data);
      setActiveAlgo((current) => (response.data[current] ? current : "fifo"));
      setRevealedStepCount(0);

      if (compareAnomaly) {
        const [threeFrame, fourFrame] = await Promise.all([
          axios.post(API_URL, { pages: parsedPages, capacity: 3 }),
          axios.post(API_URL, { pages: parsedPages, capacity: 4 }),
        ]);

        setAnomalyResults({
          three: threeFrame.data.fifo,
          four: fourFrame.data.fifo,
        });
      } else {
        setAnomalyResults(null);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          "Unable to reach the backend. Start FastAPI on http://127.0.0.1:8000.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text)] transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(circle_at_top_left,var(--glow-primary),transparent_34%),radial-gradient(circle_at_top_right,var(--glow-secondary),transparent_36%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] gap-4 px-3 py-3 md:px-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="glass-panel flex flex-col rounded-[28px] px-4 py-5 md:px-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-auto lg:rounded-[32px] lg:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 text-white shadow-lg shadow-sky-500/20">
                <Cpu size={22} />
              </div>
              <div>
                <p className="eyebrow text-[var(--accent)]">MemFlow Pro</p>
                <h1 className="text-xl font-semibold tracking-tight text-[var(--text-strong)]">Analytics Engine</h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              className="soft-button inline-flex h-11 w-11 items-center justify-center rounded-2xl"
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? <MoonStar size={18} /> : <SunMedium size={18} />}
            </button>
          </div>

          <div className="hero-panel mt-6 rounded-[28px] px-5 py-5">
            <div className="flex items-center gap-2 text-[var(--accent-contrast)]">
              <LayoutDashboard size={16} />
              <span className="eyebrow text-[var(--accent-contrast)]">Presentation Mode</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--hero-text)]">
              Reveal the workload one step at a time, explain each replacement decision, and auto-follow the newest frame as you present.
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block eyebrow">Reference String</label>
              <textarea
                value={pages}
                onChange={(event) => setPages(event.target.value)}
                rows={5}
                className="field h-32 w-full rounded-[24px] px-4 py-3 text-sm leading-6 outline-none"
                placeholder="7, 0, 1, 2, 0, 3..."
              />
              <p className="mt-2 text-xs text-[var(--text-soft)]">Commas or spaces are both fine.</p>
            </div>

            <div>
              <label className="mb-2 block eyebrow">Frame Capacity</label>
              <input
                type="number"
                min="1"
                max="10"
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className="field w-full rounded-[24px] px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="hidden gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-1">
              <button
                type="button"
                onClick={runSimulation}
                disabled={loading}
                className="primary-button flex items-center justify-center gap-2 rounded-[24px] px-4 py-3.5 text-sm font-semibold text-white"
              >
                <Play size={16} />
                {loading ? "Running simulation..." : "Run Simulator"}
              </button>

              <button
                type="button"
                onClick={() => setRevealedStepCount((current) => (hasMoreSteps ? current + 1 : current))}
                disabled={!results || !hasMoreSteps}
                className="soft-button flex items-center justify-center gap-2 rounded-[24px] px-4 py-3.5 text-sm font-semibold"
              >
                <SkipForward size={16} />
                {hasMoreSteps ? `Next Step (${revealedStepCount + 1}/${activeResult?.steps.length ?? 0})` : "All Steps Revealed"}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              <button
                type="button"
                onClick={runSimulation}
                disabled={loading}
                className="primary-button flex items-center justify-center gap-2 rounded-[24px] px-4 py-3.5 text-sm font-semibold text-white"
              >
                <Play size={16} />
                {loading ? "Running simulation..." : "Run Simulator"}
              </button>
            </div>

            <label className="soft-card flex items-start gap-3 rounded-[24px] px-4 py-3">
              <input
                type="checkbox"
                checked={compareAnomaly}
                onChange={(event) => setCompareAnomaly(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--text-strong)]">Compare 3 vs 4 Frames (FIFO Only)</span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-soft)]">
                  Best paired with the FIFO Anomaly Demo sample to show Belady&apos;s anomaly.
                </span>
              </span>
            </label>

            {error ? (
              <div className="rounded-[24px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2 eyebrow">
              <Sparkles size={14} />
              Quick Samples
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {quickSamples.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => {
                    setPages(sample.pages);
                    setCapacity(sample.capacity);
                    setCompareAnomaly(Boolean(sample.anomaly));
                    setError("");
                  }}
                  className="soft-card flex items-center justify-between rounded-[22px] px-4 py-3 text-left transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-strong)]">{sample.label}</p>
                    <p className="text-xs text-[var(--text-soft)]">{sample.capacity} frames</p>
                  </div>
                  <ArrowRight size={16} className="text-[var(--text-faint)]" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-4 md:space-y-5 lg:space-y-6">
          <section className="glass-panel rounded-[28px] px-5 py-5 md:px-6 lg:rounded-[36px] lg:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow text-[var(--accent)]">Dashboard</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-strong)] lg:text-4xl">
                  Present each memory transition with a theme-aware, responsive analytics workspace.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-soft)] lg:text-base">
                  The chart now has a real empty state, the UI supports dark mode, and new steps animate into view while the viewport follows the latest frame automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="soft-card rounded-[24px] px-4 py-4">
                  <p className="eyebrow">Refs</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{parsedPages.length}</p>
                </div>
                <div className="soft-card rounded-[24px] px-4 py-4">
                  <p className="eyebrow">Frames</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">{capacity}</p>
                </div>
                <div className="soft-card col-span-2 rounded-[24px] px-4 py-4 sm:col-span-1">
                  <p className="eyebrow">Revealed</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
                    {results ? `${revealedStepCount}/${activeResult.steps.length}` : "0/0"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {results ? (
            <>
              <section className="grid gap-4 xl:grid-cols-3">
                {Object.entries(results).map(([algoKey, result]) => (
                  <StatCard
                    key={algoKey}
                    algoKey={algoKey}
                    result={result}
                    activeAlgo={activeAlgo}
                    setActiveAlgo={setActiveAlgo}
                  />
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="glass-panel rounded-[28px] px-5 py-5 lg:rounded-[32px] lg:px-6">
                  <div className="flex items-center gap-2 eyebrow">
                    <Target size={15} />
                    Final Workload Analysis
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">{insightSummary}</p>
                </div>

                {anomalyResults ? (
                  <div className="glass-panel rounded-[28px] px-5 py-5 lg:rounded-[32px] lg:px-6">
                    <div className="flex items-center gap-2 eyebrow">
                      <Sparkles size={15} />
                      Belady&apos;s Anomaly
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="soft-card rounded-[24px] px-4 py-4">
                        <p className="eyebrow">FIFO / 3 frames</p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--text-strong)]">{anomalyResults.three.faults}</p>
                      </div>
                      <div className="rounded-[24px] border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-4">
                        <p className="eyebrow text-[var(--danger)]">FIFO / 4 frames</p>
                        <p className="mt-2 text-3xl font-semibold text-[var(--danger)]">{anomalyResults.four.faults}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-6 text-[var(--text-soft)]">
                      With this workload, FIFO records {anomalyResults.three.faults} faults using 3 frames and {anomalyResults.four.faults} faults using 4 frames.
                    </p>
                  </div>
                ) : null}
              </section>

              <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="glass-panel rounded-[28px] px-5 py-5 lg:rounded-[32px] lg:px-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="flex items-center gap-2 eyebrow">
                        <Database size={15} />
                        Step-by-Step Visualizer
                      </div>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                        {algorithmMeta[activeAlgo].label} presentation timeline
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-soft)]">
                        Each click reveals one more reference step. Newly inserted pages slide in, victim pages are isolated first, and the scroll position follows the latest frame.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {Object.entries(algorithmMeta).map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveAlgo(key)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeAlgo === key ? "bg-[var(--chip-bg)] text-[var(--chip-text)]" : "soft-button"}`}
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3 text-xs text-[var(--text-soft)]">
                    <div className="badge-hit flex items-center gap-2 rounded-full px-3 py-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Hit
                    </div>
                    <div className="badge-miss flex items-center gap-2 rounded-full px-3 py-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      Miss
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-[var(--danger-soft)] px-3 py-1.5 text-[var(--danger)] ring-1 ring-[var(--danger-border)]">
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]" />
                      Victim page
                    </div>
                  </div>

                  <div ref={timelineRef} className="mt-6 overflow-x-auto pb-3">
                    <motion.div layout className="flex min-w-max gap-4">
                      <AnimatePresence initial={false}>
                        {visibleSteps.length ? (
                          visibleSteps.map((step, stepIndex) => (
                            <div
                              key={`${activeAlgo}-${stepIndex}`}
                              ref={stepIndex === visibleSteps.length - 1 ? latestStepRef : null}
                            >
                              <TimelineStep
                                step={step}
                                stepIndex={stepIndex}
                                totalFrames={Number.parseInt(capacity, 10)}
                                isNewest={stepIndex === visibleSteps.length - 1}
                              />
                            </div>
                          ))
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="soft-card rounded-[28px] px-8 py-12 text-sm text-[var(--text-soft)]"
                          >
                            Run the simulation, then use Next Step to reveal the first column.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </div>

                <div className="glass-panel rounded-[28px] px-5 py-5 lg:rounded-[32px] lg:px-6">
                  <div className="flex items-center gap-2 eyebrow">
                    <Target size={15} />
                    Comparison
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-1">
                    {Object.entries(results).map(([algoKey, result]) => (
                      <div
                        key={`summary-${algoKey}`}
                        className={`soft-card rounded-[24px] px-4 py-4 ${algoKey === activeAlgo ? "ring-2 ring-[var(--accent-soft)]" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-strong)]">
                              {algorithmMeta[algoKey].label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[var(--text-soft)]">
                              {algorithmMeta[algoKey].summary}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[var(--chip-bg)] px-3 py-2 text-right text-[var(--chip-text)]">
                            <p className="eyebrow text-[var(--chip-text)]/70">Faults</p>
                            <p className="text-lg font-semibold">{result.faults}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="glass-panel rounded-[28px] px-5 py-5 lg:rounded-[32px] lg:px-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 eyebrow">
                      <TrendingUp size={15} />
                      Live Workload Efficiency
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
                      Performance benchmarking in real-time
                    </h3>
                  </div>
                  <div className="hidden rounded-2xl bg-[var(--surface-muted)] px-4 py-2 sm:block">
                    <p className="eyebrow text-[var(--text-soft)]">Total Reveal</p>
                    <p className="text-center font-bold text-[var(--text-strong)]">{revealedStepCount}</p>
                  </div>
                </div>
                
                <p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">
                  Compare how each replacement policy handles the revealed reference string. Lower strains and higher efficiency scores indicate better locality handling.
                </p>

                <div className="mt-8">
                  {revealedMetrics ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(revealedMetrics.metrics).map(([key, metrics]) => (
                        <RevealedStatCard
                          key={key}
                          algoKey={key}
                          metrics={metrics}
                          totalRevealed={revealedStepCount}
                          winnerKey={revealedMetrics.winner}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="soft-card flex h-48 flex-col items-center justify-center rounded-[28px] border-dashed text-center">
                      <Database size={32} className="mb-4 text-[var(--text-faint)]" />
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        No steps revealed yet
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-soft)]">
                        Progress will appear here once you start the walkthrough.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <section className="glass-panel flex min-h-[520px] items-center justify-center rounded-[28px] px-6 py-10 lg:rounded-[36px]">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_20px_50px_-24px_rgba(37,99,235,0.8)]">
                  <LayoutDashboard size={34} />
                </div>
                <h3 className="mt-6 text-3xl font-semibold tracking-tight text-[var(--text-strong)]">
                  Ready for a live walkthrough
                </h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-soft)] lg:text-base">
                  Configure a workload, run the simulator, and then drive the experience with Next Step so each replacement decision lands clearly.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>

      {results ? (
        <div className="mobile-stepper glass-panel fixed inset-x-3 bottom-3 z-40 rounded-[24px] px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Step Progress</p>
              <p className="truncate text-sm font-semibold text-[var(--text-strong)]">
                {algorithmMeta[activeAlgo].label}: {revealedStepCount}/{activeResult.steps.length} revealed
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevealedStepCount((current) => (hasMoreSteps ? current + 1 : current))}
              disabled={!hasMoreSteps}
              className="primary-button flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <SkipForward size={16} />
              {hasMoreSteps ? "Next Step" : "Done"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
