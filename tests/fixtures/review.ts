import type { AnswerReview } from "@/lib/homework/review";
export const teacherTask = "Écris trois phrases avec le mot « ballon ».";
export const passedReview: AnswerReview = {
  status: "passed",
  summaryEnglish: "You wrote three clear French sentences using ballon.",
  requirements: [
    {
      requirementEnglish: "Write three French sentences with ballon.",
      met: true,
      feedbackEnglish: "All three sentences use the word.",
    },
  ],
  strengths: ["You used the required word in each sentence."],
  improvements: [],
  practice: null,
};
export const needsWorkReview: AnswerReview = {
  status: "needs_work",
  summaryEnglish: "Good start! Add two more complete sentences.",
  requirements: [
    {
      requirementEnglish: "Write three French sentences with ballon.",
      met: false,
      feedbackEnglish: "You wrote one sentence. The teacher asked for three.",
    },
  ],
  strengths: ["Your first sentence uses ballon."],
  improvements: ["Add two more complete French sentences."],
  practice: {
    instructionFrench: "Écris une phrase avec le mot ballon.",
    instructionEnglish: "Write one sentence using ballon.",
    hintEnglish: "Think about what someone does with the ball.",
  },
};
