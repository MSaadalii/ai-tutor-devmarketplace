"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { BoardToolbar } from "@/components/board/BoardToolbar";
import { CaptionBar } from "@/components/board/CaptionBar";
import { LessonStepper } from "@/components/lesson/LessonStepper";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  SUPABASE_CONFIG_MESSAGE,
} from "@/lib/supabase/client";
import { speakLine, cancelSpeech, isSpeechSupported } from "@/lib/voice/speech";
import { getPack, BINOMIAL_SQUARE_ID } from "@/lib/packs/binomial_square";
import { DiagnosePanel } from "@/components/lesson/DiagnosePanel";
import { QuestionPanel } from "@/components/lesson/QuestionPanel";
import { BoardTaskPanel } from "@/components/lesson/BoardTaskPanel";
import { QuizPanel, type QuizResult } from "@/components/lesson/QuizPanel";
import { SummaryPanel } from "@/components/lesson/SummaryPanel";
import type { LearningSessionRow, NarrationStep, AppLanguage } from "@/types";

const PHASE_INDEX: Record<string, number> = {
  diagnose: 0,
  board: 1,
  question: 2,
  board_task: 3,
  quiz: 4,
  summary_ready: 4,
  summary: 5,
};

const PROBLEM = "(x+3)^2";

export function LessonClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const pack = useMemo(() => getPack(), []);

  const [session, setSession] = useState<LearningSessionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("en");

  const [diagnosis, setDiagnosis] = useState<{
    outcome: string;
    explanation: string;
    probes?: { question: string }[];
    misconception_id?: string;
  } | null>(null);
  const [probeAnswers, setProbeAnswers] = useState<string[]>([]);

  const [steps, setSteps] = useState<NarrationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState<string>("");
  const [boardError, setBoardError] = useState<string | null>(null);
  const [configWarning, setConfigWarning] = useState<string | null>(null);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A monotonically increasing token prevents a late speech/timer callback from
  // restarting narration after pause, replay, or navigation.
  const playbackIdRef = useRef(0);

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [answerText, setAnswerText] = useState<string | null>(null);

  const [taskSelections, setTaskSelections] = useState<string[]>([]);
  const [taskResult, setTaskResult] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [summary, setSummary] = useState<string[] | null>(null);

  const activePhase = useMemo(() => {
    if (summary) return "summary";
    if (quizResults.length === pack.quiz.length && pack.quiz.length > 0)
      return "summary_ready";
    if (taskResult?.correct) return "quiz";
    if (answerText !== null) return "board_task";
    if (steps.length > 0) return "question";
    // Stay in diagnose while there are unanswered probes from any outcome.
    if (
      diagnosis?.probes &&
      diagnosis.probes.length > probeAnswers.length
    ) {
      return "diagnose";
    }
    if (diagnosis) return "board";
    return "diagnose";
  }, [summary, quizResults, taskResult, answerText, steps, diagnosis, probeAnswers, pack]);

  const activeIndex = PHASE_INDEX[activePhase] ?? 0;

  const loadSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(SUPABASE_CONFIG_MESSAGE);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("learning_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !data) {
      setError(fetchError?.message ?? "Session not found");
      setLoading(false);
      return;
    }

    const row = data as LearningSessionRow;
    setSession(row);
    setLanguage(row.language);
    setLoading(false);
  }, [router, sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // Warn up-front when Gemini is not configured (booleans only, no values).
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: { gemini?: boolean }) => {
        if (h.gemini === false) {
          setConfigWarning(
            "Gemini is not configured. Add GEMINI_API_KEY in the workspace " +
              "Secrets panel — diagnosis, board explanation and quiz coaching need it.",
          );
        }
      })
      .catch(() => {});
  }, []);

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: { error?: string } & Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      // Non-JSON body (e.g. platform error page) — fall through to status text.
    }
    if (!res.ok) {
      throw new Error(data.error ?? `Request failed (${res.status})`);
    }
    return data as T;
  }

  /** Runs a lesson action; any failure is shown in the red notice, never swallowed. */
  async function guarded(action: () => Promise<void>): Promise<boolean> {
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return false;
    }
  }

  async function handleDiagnose(answer: string, nextProbeAnswers: string[]) {
    setError(null);
    await guarded(async () => {
      const data = await postJson<{
        outcome: string;
        explanation: string;
        probes?: { question: string }[];
        misconception_id?: string;
      }>("/api/ai/detective", {
        session_id: sessionId,
        problem: PROBLEM,
        student_answer: answer,
        prior_probes: diagnosis?.probes?.map((p) => p.question),
        prior_responses: nextProbeAnswers,
        language,
      });
      setProbeAnswers(nextProbeAnswers);
      setDiagnosis(data);
    });
  }

  async function playBoard() {
    setBoardError(null);
    setPlaying(true);

    // Resume from the next step if we already have narration; otherwise fetch.
    if (steps.length > 0 && currentStepIndex < steps.length - 1) {
      const playbackId = playbackIdRef.current;
      playSteps(steps, currentStepIndex + 1, playbackId);
      return;
    }
    if (steps.length > 0 && currentStepIndex >= steps.length - 1) {
      const playbackId = playbackIdRef.current;
      playSteps(steps, 0, playbackId);
      return;
    }

    setCurrentStepIndex(-1);
    setCaption(language === "ur" ? "وضاحت شروع ہو رہی ہے…" : "Starting explanation…");

    try {
      const data = await postJson<{ steps: NarrationStep[] }>("/api/ai/board-tutor", {
        session_id: sessionId,
        problem: PROBLEM,
        misconception_id: diagnosis?.misconception_id,
        mode: "teach",
        language,
      });
      setSteps(data.steps);
      playSteps(data.steps, 0, playbackIdRef.current);
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : "Board tutor failed");
      setPlaying(false);
    }
  }

  function clearStepTimer() {
    if (stepTimerRef.current) {
      clearTimeout(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }

  function stopPlayback() {
    playbackIdRef.current += 1;
    clearStepTimer();
    cancelSpeech();
  }

  function playSteps(
    stepList: NarrationStep[],
    fromIndex = 0,
    playbackId = playbackIdRef.current,
  ) {
    if (playbackId !== playbackIdRef.current) return;
    clearStepTimer();
    cancelSpeech();

    if (fromIndex >= stepList.length) {
      setPlaying(false);
      setCaption(
        language === "ur"
          ? "وضاحت مکمل۔ اب ایک سوال پوچھیں۔"
          : "Explanation complete. Now ask a question or continue.",
      );
      return;
    }

    setCurrentStepIndex(fromIndex);
    const step = stepList[fromIndex];
    setCaption(step.spokenLine);
    const advance = () => {
      if (playbackId === playbackIdRef.current) {
        playSteps(stepList, fromIndex + 1, playbackId);
      }
    };

    if (isSpeechSupported()) {
      speakLine(step.spokenLine, language, advance, advance);
      return;
    }

    stepTimerRef.current = setTimeout(advance, 2500);
  }

  function pauseBoard() {
    stopPlayback();
    setPlaying(false);
  }

  function replayBoard() {
    stopPlayback();
    if (steps.length > 0) {
      const playbackId = playbackIdRef.current;
      setPlaying(true);
      playSteps(steps, 0, playbackId);
    }
  }

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  async function handleAskQuestion(text: string) {
    stopPlayback();
    setPlaying(false);
    setError(null);
    await guarded(async () => {
      const data = await postJson<{ notes?: string }>("/api/ai/board-tutor", {
        session_id: sessionId,
        problem: PROBLEM,
        mode: "answer",
        question: text,
        selected_element_ids: selectedElementIds,
        language,
      });
      setAnswerText(data.notes ?? "Answer received.");
    });
  }

  async function handleTaskSubmit() {
    stopPlayback();
    setPlaying(false);
    setError(null);
    await guarded(async () => {
      const data = await postJson<{ correct: boolean; message: string }>(
        "/api/board-task",
        {
          session_id: sessionId,
          selected_element_ids: taskSelections,
          language,
        },
      );
      setTaskResult(data);
    });
  }

  async function handleQuizSubmit(seed: string, answer: string) {
    setError(null);
    return guarded(async () => {
      const data = await postJson<QuizResult>("/api/ai/quiz-explain", {
        session_id: sessionId,
        item_seed: seed,
        answer,
        language,
      });
      setQuizResults((prev) => [...prev, data]);
    });
  }

  async function handleFinishQuiz() {
    stopPlayback();
    setPlaying(false);
    setError(null);
    await guarded(async () => {
      const data = await postJson<{ bullets: string[] }>("/api/summary", {
        session_id: sessionId,
        language,
      });
      setSummary(data.bullets);
    });
  }

  function toggleElement(id: string) {
    if (activePhase === "board_task") {
      setTaskSelections((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelectedElementIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    }
  }

  if (!loading && !session) {
    return (
      <PageShell actions={<SignOutButton />}>
        <div className="space-y-3">
          <AuthNotice kind="error">
            {error ?? "Session not found or not yours."}
          </AuthNotice>
          <Link href="/app" className="text-sm font-medium text-teal-800 underline">
            Back to My lessons
          </Link>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell actions={<SignOutButton />}>
        <p className="text-sm text-stone-500">Loading lesson…</p>
      </PageShell>
    );
  }

  return (
    <PageShell wide actions={<SignOutButton />}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              {pack.title} ·{" "}
              {session?.pack_id === BINOMIAL_SQUARE_ID ? "pack" : "topic"}
            </p>
            <h1 className="text-2xl font-semibold">{PROBLEM}</h1>
          </div>
          <LessonStepper activeIndex={activeIndex} />
        </div>

        {configWarning ? <AuthNotice kind="error">{configWarning}</AuthNotice> : null}
        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        {boardError ? <AuthNotice kind="error">{boardError}</AuthNotice> : null}

        {diagnosis ? (
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <p className="font-medium">Diagnosis: {diagnosis.outcome}</p>
            <p className="text-stone-600">{diagnosis.explanation}</p>
            {activePhase !== "diagnose" ? (
              <p className="mt-1 font-medium text-teal-800">
                Diagnosis done. Press “Play explanation” to watch the board.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">Language:</span>
          <Button
            size="sm"
            variant={language === "en" ? "default" : "outline"}
            onClick={() => setLanguage("en")}
          >
            English
          </Button>
          <Button
            size="sm"
            variant={language === "ur" ? "default" : "outline"}
            onClick={() => setLanguage("ur")}
          >
            اردو
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <BoardToolbar
            onPlay={playBoard}
            onPause={pauseBoard}
            onReplay={replayBoard}
            disabled={activePhase === "diagnose"}
            playing={playing}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUseSvgFallback((v) => !v)}
          >
            {useSvgFallback ? "Use Excalidraw" : "Use SVG fallback"}
          </Button>
        </div>

        {activePhase === "diagnose" ? (
          <p className="text-sm text-stone-600">
            Play is locked. Submit your diagnosis below to unlock it.
          </p>
        ) : null}

        <CaptionBar text={caption || undefined} language={language} />

        <BoardCanvas
          steps={steps}
          currentStepIndex={currentStepIndex}
          selectedElementIds={
            activePhase === "board_task" ? taskSelections : selectedElementIds
          }
          onElementClick={toggleElement}
          taskElementIds={pack.boardTaskElementIds}
          taskMode={activePhase === "board_task"}
          fallback={useSvgFallback ? "svg" : "excalidraw"}
        />

        {activePhase === "diagnose" && (
          <DiagnosePanel
            problem={PROBLEM}
            diagnosis={diagnosis}
            onDiagnose={handleDiagnose}
            probeAnswers={probeAnswers}
          />
        )}

        {(activePhase === "question" || activePhase === "board_task") && (
          <QuestionPanel
            selectedElementIds={selectedElementIds}
            answerText={answerText}
            onAsk={handleAskQuestion}
          />
        )}

        {activePhase === "board_task" && (
          <BoardTaskPanel onSubmit={handleTaskSubmit} result={taskResult} />
        )}

        {(activePhase === "quiz" || activePhase === "summary_ready") && (
          <QuizPanel
            items={pack.quiz}
            language={language}
            results={quizResults}
            onSubmit={handleQuizSubmit}
            onFinish={handleFinishQuiz}
          />
        )}

        {summary ? (
          <SummaryPanel bullets={summary} language={language} />
        ) : null}
      </div>
    </PageShell>
  );
}
