"use client";

import { useState } from "react";
import { recordScore } from "../gem-store";
import type { GameProps } from "../shared/context";
import { GameButton, Overlay } from "../shared/overlay";

/**
 * Five questions on the four Cs.
 *
 * Every answer here is standard gemmology, and every one of them matches what
 * this site already says on its own guide pages — the D–Z scale in
 * lib/color-grades.ts, the FL–I3 scale in lib/clarity-grades.ts, and the
 * weight-to-size relationship the carat chart is built on. Nothing claims
 * anything about the stock: a quiz is not the place to make a grading claim
 * about goods a buyer might order.
 */

const PASS = 4;

type Question = {
  c: "Cut" | "Colour" | "Clarity" | "Carat";
  ask: string;
  options: string[];
  answer: number;
  because: string;
};

const QUESTIONS: Question[] = [
  {
    c: "Cut",
    ask: "A diamond's cut grade describes…",
    options: [
      "Its shape — round, oval, emerald",
      "How its proportions, symmetry and polish return light",
      "How many facets it has",
      "Whether it was cut by hand or by machine",
    ],
    answer: 1,
    because:
      "Shape and cut are different things. Shape is the outline; cut grades the work — proportions, symmetry and polish — and it is the only one of the four Cs that is about craft rather than the rough crystal.",
  },
  {
    c: "Colour",
    ask: "On the GIA D–Z scale, which grade is the colourless end?",
    options: ["Z", "M", "D", "A"],
    answer: 2,
    because:
      "The scale starts at D and runs to Z as warmth increases. D–F is colourless; G–J is near colourless, where colour is hard to see face up and the value usually sits.",
  },
  {
    c: "Clarity",
    ask: "In a clarity grade, what does VS stand for?",
    options: ["Very Small", "Very Slightly Included", "Visibly Sound", "Very Superior"],
    answer: 1,
    because:
      "VS is Very Slightly Included — inclusions a grader finds under 10× magnification with some effort. The full scale runs FL, IF, VVS, VS, SI, then I.",
  },
  {
    c: "Carat",
    ask: "One carat weighs…",
    options: ["1 gram", "0.2 grams", "0.5 grams", "2 grams"],
    answer: 1,
    because:
      "A carat is 200 milligrams, or a fifth of a gram, and divides into 100 points — so a 0.75 ct stone is a seventy-five pointer.",
  },
  {
    c: "Carat",
    ask: "Two round diamonds both weigh 1.00 ct. Why might one look noticeably bigger face up?",
    options: [
      "Carat weight is only an estimate",
      "The bigger one is a different colour grade",
      "A deeper stone carries more of its weight below the girdle",
      "Lab-grown stones are always larger",
    ],
    answer: 2,
    because:
      "Weight is not width. A stone cut deep hides weight underneath, where nobody sees it, and faces up smaller than a well-proportioned stone of the same weight — which is why a report gives measurements as well as carats.",
  },
];

export function FourCsQuiz({ onClose, onWin }: GameProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const question = QUESTIONS[index];
  const correct = picked === question?.answer;

  const choose = (option: number) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    const finalScore = score;
    if (index + 1 >= QUESTIONS.length) {
      setDone(true);
      recordScore("four-cs-quiz", finalScore);
      if (finalScore >= PASS) onWin();
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const passed = score >= PASS;
    return (
      <Overlay
        title="The Four Cs"
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-[13px] tabular-nums text-ink-muted">
              {score} of {QUESTIONS.length}
            </p>
            <div className="flex gap-2">
              <GameButton variant="outline" onClick={restart}>
                Try again
              </GameButton>
              <GameButton onClick={onClose}>Done</GameButton>
            </div>
          </div>
        }
      >
        <p className="font-display text-[26px] leading-tight">
          {passed ? "That is a grader's eye" : "Worth brushing up"}
        </p>
        <p className="measure mt-3 text-[15px] text-ink-muted">
          {passed
            ? `${score} out of ${QUESTIONS.length}. The gem is yours.`
            : `${score} out of ${QUESTIONS.length}. ${PASS} takes the gem, and there is no penalty for going round again.`}
        </p>
        <p className="mt-4 text-[14px] text-ink-muted">
          The long version of all of this lives in the guides — cut, colour, clarity and carat each
          have their own.
        </p>
      </Overlay>
    );
  }

  return (
    <Overlay
      title="The Four Cs"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] tabular-nums text-ink-muted">
            Question {index + 1} of {QUESTIONS.length} · {score} right
          </p>
          {picked !== null ? (
            <GameButton onClick={next}>
              {index + 1 === QUESTIONS.length ? "See result" : "Next"}
            </GameButton>
          ) : null}
        </div>
      }
    >
      <p className="text-[12px] text-ink-muted">{question.c}</p>
      <h3 className="mt-1.5 font-display text-[22px] leading-tight">{question.ask}</h3>

      <ul className="mt-5 space-y-2">
        {question.options.map((option, i) => {
          const chosen = picked === i;
          const isAnswer = i === question.answer;
          const reveal = picked !== null;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={reveal}
                aria-label={reveal && isAnswer ? `${option} — correct answer` : option}
                className={`w-full rounded-[14px] border px-4 py-3 text-left text-[15px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  reveal && isAnswer
                    ? "border-ink bg-panel"
                    : chosen
                      ? "border-ink-muted bg-panel/60 line-through decoration-ink-muted"
                      : reveal
                        ? "border-hairline opacity-60"
                        : "border-hairline hover:border-ink"
                }`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {picked !== null ? (
        <div role="status" className="mt-5 rounded-[16px] bg-panel px-5 py-4">
          <p className="text-[14px]">{correct ? "Correct." : "Not quite."}</p>
          <p className="mt-1.5 text-[14px] text-ink-muted-panel">{question.because}</p>
        </div>
      ) : null}
    </Overlay>
  );
}
