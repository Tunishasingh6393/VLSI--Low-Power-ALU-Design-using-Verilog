import React, { useState } from "react";
import { BookOpen, Award, CheckCircle, HelpCircle, ChevronRight, RotateCcw, Info } from "lucide-react";
import { INTERVIEW_QUESTIONS } from "../data/alu_project_data";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "Which of the following describes the operational mechanism of Operand Isolation?",
    options: [
      "Forcing the system clock to completely stop ticking when the ALU experiences a timing violation",
      "Clamping inputs of unused arithmetic/logic sub-blocks to logical zeroes to prevent node switching toggles",
      "Shielding the physical FPGA transistors using copper isolation shielding meshes",
      "Increasing structural redundancy to bypass layout routing congestion during place and route"
    ],
    correctIdx: 1,
    explanation: "Operand Isolation intercepts operand buses A and B directly at the input of functional blocks, logically masking them to zeroes using simple gates unless their specific opcode is selected. This halts dynamic gate toggle cascades inside inactive modules."
  },
  {
    question: "When writing the Verilog statement: always @(posedge clk) if (en) Q <= D; what cell does synthesis infer?",
    options: [
      "A classical 12-stage ripple carry delay buffer cell",
      "A standard combinational look-up table (LUT4)",
      "An Integrated Clock Gating (ICG) cell tied to the clock tree distribution branch",
      "A high-leakage static pull-up transistor"
    ],
    correctIdx: 2,
    explanation: "Modern RTL registers with clock-enable conditions map cleanly during synthesis to physical Integrated Clock Gating (ICG) cells inside standard cell libraries. This cuts out toggling currents straight at the tree clock buffer level, saving active power."
  },
  {
    question: "What is the primary PPA (Power-Performance-Area) tradeoff of a Carry Lookahead Adder (CLA) over a Ripple Carry Adder (RCA)?",
    options: [
      "CLA reduces cell area by half but suffers from linear carry delay cascades",
      "CLA offers fast logarithmic performance O(log N) but requires significantly higher gate cell area and wire switching power",
      "CLA is slower than RCA but has zero static power subthreshold leakage",
      "There is no design tradeoff; CLAs are superior in all power, timing, and area scales"
    ],
    correctIdx: 1,
    explanation: "CLAs compute intermediate lookahead carries in parallel using propagate/generate logical trees, boosting speed significantly. However, they occupy higher layout area and dynamic transit power compared to RCAs, representing a classic speed-versus-power trade-off."
  },
  {
    question: "In what way does 'lp_mode' minimize dynamic power within wide Barrel Shifters?",
    options: [
      "By resetting all internal registers to state zero perpetually",
      "By masking shifting widths to a simple 1-bit step, preventing multi-stage multiplexer propagation cascades",
      "By physical over-clocking to decrease total cycle computations duration",
      "By routing the outputs through low-resistance analog analog-by-passes"
    ],
    correctIdx: 2,
    explanation: "A barrel shifter contains multiple cascading stages of multiplexers. When lp_mode is active, we mask the shift amount (shamt) to a maximum of 1-bit, forcing downstream multiplexers to stay static, protecting them from wide transition surges."
  },
  {
    question: "How can dynamic switching activity reductions be accurately analyzed in digital design without physical silicon?",
    options: [
      "By manually measuring the static power values using portable voltmeters",
      "By logging simulator node toggles into a Value Change Dump (VCD) or SAIF file and analyzing transition events",
      "By running behavioral testbenches on high speed analog oscilloscopes",
      "By measuring compiler CPU log-files generation speeds on host computers"
    ],
    correctIdx: 1,
    explanation: "VCD and SAIF logs record every single 0-to-1 and 1-to-0 transition on internal wires and pins. Comparing relative VCD file sizes or counting node toggles confirms active dynamic activity reduction before taping out silicon."
  }
];

export default function InterviewPreparer() {
  const [activeCardIdx, setActiveCardIdx] = useState<number>(0);
  const [cardRevealed, setCardRevealed] = useState<boolean>(false);
  
  // Quiz states
  const [quizStarted, setQuizStarted] = useState<boolean>(false);
  const [curQIdx, setCurQIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const handleSelectOption = (optIdx: number) => {
    if (answers[curQIdx] !== undefined) return; // already answered
    setAnswers(prev => ({ ...prev, [curQIdx]: optIdx }));
  };

  const handleNextQuiz = () => {
    if (curQIdx < QUIZ_QUESTIONS.length - 1) {
      setCurQIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurQIdx(0);
    setAnswers({});
    setQuizFinished(false);
    setQuizStarted(true);
  };

  const getScore = () => {
    let score = 0;
    QUIZ_QUESTIONS.forEach((q, idx) => {
      if (answers[idx] === q.correctIdx) score++;
    });
    return score;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="interview-prep-panel">
      {/* 1. Flashcard Interview Prep */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-4">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase font-sans">Viva & Interview QnA Cards</h3>
          </div>

          <div className="mb-4 flex justify-between items-center text-xs font-mono text-slate-500">
            <span>VLSI Board Deck</span>
            <span>Question {activeCardIdx + 1} of {INTERVIEW_QUESTIONS.length}</span>
          </div>

          {/* Flashcard Body */}
          <div 
            onClick={() => setCardRevealed(!cardRevealed)}
            className="bg-slate-950 border border-slate-800 rounded-xl p-5 min-h-[190px] flex flex-col justify-between cursor-pointer hover:border-slate-700 transition-all relative overflow-hidden group select-none"
          >
            {/* Visual shine card effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/5 to-transparent blur-xl pointer-events-none" />

            <div>
              <span className="text-[9px] uppercase tracking-wide font-bold font-mono text-emerald-400">
                {cardRevealed ? "Answer Key Revealed" : "Click Card to Reveal Answer"}
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-2 line-clamp-4 leading-relaxed font-sans">
                {INTERVIEW_QUESTIONS[activeCardIdx].question}
              </p>
            </div>

            {cardRevealed ? (
              <div className="mt-4 border-t border-slate-850 pt-3 text-[11px] font-mono leading-relaxed text-slate-400 max-h-[140px] overflow-y-auto pr-1">
                {INTERVIEW_QUESTIONS[activeCardIdx].answer}
              </div>
            ) : (
              <div className="mt-6 flex justify-center text-[10px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                [ Click anywhere to flip card ]
              </div>
            )}
          </div>
        </div>

        {/* Carousel buttons */}
        <div className="flex justify-between items-center mt-5">
          <button
            onClick={() => {
              setCardRevealed(false);
              setActiveCardIdx(prev => (prev > 0 ? prev - 1 : INTERVIEW_QUESTIONS.length - 1));
            }}
            className="text-[11px] font-mono bg-slate-800 border border-slate-750 text-slate-300 py-1.5 px-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Previous
          </button>
          <span className="text-[11px] font-mono text-slate-500">
            Topic: Low-Power Architectures
          </span>
          <button
            onClick={() => {
              setCardRevealed(false);
              setActiveCardIdx(prev => (prev < INTERVIEW_QUESTIONS.length - 1 ? prev + 1 : 0));
            }}
            className="text-[11px] font-mono bg-slate-800 border border-slate-750 text-slate-300 py-1.5 px-3 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Next Card
          </button>
        </div>
      </div>

      {/* 2. Interactive VLSI Quiz */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
        {!quizStarted ? (
          <div className="text-center py-8 flex flex-col items-center justify-center gap-4 my-auto h-full">
            <Award className="w-12 h-12 text-emerald-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-slate-200 uppercase font-sans">VLSI Knowledge Check</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                Test your understanding of hardware clock gating, carry-bound propagation limits, and operand-isolation gate cells.
              </p>
            </div>
            <button
              onClick={() => setQuizStarted(true)}
              className="py-2 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-bold text-xs uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
            >
              Start Practice Quiz
            </button>
          </div>
        ) : quizFinished ? (
          <div className="text-center py-6 flex flex-col items-center justify-center gap-4 my-auto h-full">
            <CheckCircle className="w-12 h-12 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-200 uppercase font-sans">Practice Quiz Complete!</h4>
              <p className="text-xl font-mono font-bold text-emerald-400 mt-2">
                Your Score: {getScore()} / {QUIZ_QUESTIONS.length}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto">
                {getScore() === QUIZ_QUESTIONS.length 
                  ? "Flawless! You demonstrate exceptional industrial readiness for a junior digital VLSI role."
                  : "Excellent effort. Read through the technical answers on the left to patch up your digital foundations."}
              </p>
            </div>
            <button
              onClick={resetQuiz}
              className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Quiz
            </button>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mb-3">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  Concept verification
                </span>
                <span>Question {curQIdx + 1} of {QUIZ_QUESTIONS.length}</span>
              </div>

              {/* Question */}
              <h4 className="text-xs sm:text-sm font-semibold text-slate-200 mb-4 leading-relaxed font-sans">
                {QUIZ_QUESTIONS[curQIdx].question}
              </h4>

              {/* Options */}
              <div className="space-y-2">
                {QUIZ_QUESTIONS[curQIdx].options.map((opt, oIdx) => {
                  const isAnswered = answers[curQIdx] !== undefined;
                  const isSelected = answers[curQIdx] === oIdx;
                  const isCorrect = QUIZ_QUESTIONS[curQIdx].correctIdx === oIdx;

                  let optClass = "border-slate-805 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900";
                  if (isAnswered) {
                    if (isCorrect) optClass = "border-emerald-500 bg-emerald-950/20 text-emerald-300 font-medium";
                    else if (isSelected) optClass = "border-rose-500 bg-rose-950/20 text-rose-300";
                    else optClass = "border-slate-900 bg-slate-950/40 text-slate-600 opacity-60";
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`w-full p-2.5 rounded-lg border text-left font-sans text-xs flex justify-between items-center transition-all ${optClass} ${!isAnswered && 'cursor-pointer'}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isCorrect && <span className="text-[9px] font-mono text-emerald-400 font-bold ml-1.5 shrink-0">CORRECT</span>}
                      {isAnswered && isSelected && !isCorrect && <span className="text-[9px] font-mono text-rose-400 font-bold ml-1.5 shrink-0">WRONG</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation note */}
              {answers[curQIdx] !== undefined && (
                <div className="mt-4 bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 flex gap-2 leading-relaxed">
                  <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-300">Explanation:</span> {QUIZ_QUESTIONS[curQIdx].explanation}
                  </div>
                </div>
              )}
            </div>

            {/* Answer check trigger */}
            {answers[curQIdx] !== undefined && (
              <button
                onClick={handleNextQuiz}
                className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-lg flex items-center justify-center gap-1 border border-slate-700"
              >
                {curQIdx === QUIZ_QUESTIONS.length - 1 ? "Finish Quiz" : "Next Question"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
