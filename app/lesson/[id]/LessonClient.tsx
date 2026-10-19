"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [useExcalidraw, setUseExcalidraw] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data as T;
  }

  async function handleDiagnose(answer: string, nextProbeAnswers: string[]) {
    setError(null);
    setProbeAnswers(nextProbeAnswers);
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
    setDiagnosis(data);
  }

  async function playBoard() {
    setBoardError(null);
    setPlaying(true);
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
      playSteps(data.steps);
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

  function playSteps(stepList: NarrationStep[], fromIndex = 0) {
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

    if (isSpeechSupported()) {
      speakLine(
        step.spokenLine,
        language,
        () => playSteps(stepList, fromIndex + 1),
        () => playSteps(stepList, fromIndex + 1),
      );
      return;
    }

    stepTimerRef.current = setTimeout(
      () => playSteps(stepList, fromIndex + 1),
      2500,
    );
  }

  function pauseBoard() {
    clearStepTimer();
    cancelSpeech();
    setPlaying(false);
  }

  function replayBoard() {
    clearStepTimer();
    cancelSpeech();
    if (steps.length > 0) {
      setPlaying(true);
      playSteps(steps, 0);
    }
  }

  useEffect(() => {
    return () => {
      clearStepTimer();
      cancelSpeech();
    };
  }, []);

  async function handleAskQuestion(text: string) {
    setError(null);
    const data = await postJson<{ notes?: string }>("/api/ai/board-tutor", {
      session_id: sessionId,
      problem: PROBLEM,
      mode: "answer",
      question: text,
      selected_element_ids: selectedElementIds,
      language,
    });
    setAnswerText(data.notes ?? "Answer received.");
  }

  async function handleTaskSubmit() {
    setError(null);
    const data = await postJson<{ correct: boolean; message: string }>(
      "/api/board-task",
      {
        session_id: sessionId,
        selected_element_ids: taskSelections,
        language,
      },
    );
    setTaskResult(data);
  }

  async function handleQuizSubmit(seed: string, answer: string) {
    setError(null);
    const data = await postJson<QuizResult>("/api/ai/quiz-explain", {
      session_id: sessionId,
      item_seed: seed,
      answer,
      language,
    });
    setQuizResults((prev) => [...prev, data]);
  }

  async function handleFinishQuiz() {
    setError(null);
    const data = await postJson<{ bullets: string[] }>("/api/summary", {
      session_id: sessionId,
      language,
    });
    setSummary(data.bullets);
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

        {error ? <AuthNotice kind="error">{error}</AuthNotice> : null}
        {boardError ? <AuthNotice kind="error">{boardError}</AuthNotice> : null}

        {diagnosis ? (
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <p className="font-medium">Diagnosis: {diagnosis.outcome}</p>
            <p className="text-stone-600">{diagnosis.explanation}</p>
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

        <BoardToolbar
          onPlay={playBoard}
          onPause={pauseBoard}
          onReplay={replayBoard}
          disabled={activePhase === "diagnose" || playing}
        />

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
        />

        {activePhase === "diagnose" && (
          <DiagnosePanel
            problem={PROBLEM}
            diagnosis={diagnosis}
            onDiagnose={handleDiagnose}
            probeAnswers={probeAnswers}
            onProbeAnswersChange={setProbeAnswers}
          />
        )}

        {activePhase === "question" && (
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
