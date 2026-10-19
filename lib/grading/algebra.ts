import { create, all } from "mathjs";

const math = create(all, {});

export type AlgebraGrade = {
  completion: boolean;
  correctness: boolean;
  message?: string;
};

const unicodeMinus = /\u2212/g;
const superscriptTwo = /\u00b2/g;
const superscriptThree = /\u00b3/g;
const multiplicationDot = /\u22c5|\u00d7/g;

function normalizeInput(input: string): string {
  return input
    .replace(unicodeMinus, "-")
    .replace(superscriptTwo, "^2")
    .replace(superscriptThree, "^3")
    .replace(multiplicationDot, "*")
    .trim();
}

function isExpanded(form: string): boolean {
  const compact = form.replace(/\s+/g, "");
  if (/[()]/.test(compact)) return false;
  // Disallow power applied to anything other than a single variable, e.g. (x+3)^2
  if (/\)[\^]/.test(compact)) return false;
  return true;
}

function evaluateExpression(expr: string, x: number): number {
  return math.evaluate(expr, { x });
}

function expressionsEquivalent(
  expected: string,
  student: string,
  samples: number[] = [-3, -2, -1, 0, 1, 2, 3],
): boolean {
  return samples.every(
    (x) =>
      Math.abs(evaluateExpression(expected, x) - evaluateExpression(student, x)) <
      1e-6,
  );
}

/**
 * Grade a binomial-square expansion (or any single-variable polynomial expansion).
 *
 * Rules from SPEC §7:
 *  - Completion: no parentheses / powers of sums.
 *  - Correctness: coefficients match the expected expansion.
 *  - Re-entering (x+3)^2 or (x+3)(x+3) fails completion.
 */
export function gradeBinomialExpansion(
  expected: string,
  student: string,
): AlgebraGrade {
  const raw = normalizeInput(student);
  if (!raw) {
    return {
      completion: false,
      correctness: false,
      message: "Enter an answer.",
    };
  }

  try {
    // Validate that the student answer parses.
    math.parse(raw);
  } catch {
    return {
      completion: false,
      correctness: false,
      message:
        "Could not read your answer. Use x, numbers, +, -, *, /, and ^ only.",
    };
  }

  if (!isExpanded(raw)) {
    return {
      completion: false,
      correctness: false,
      message:
        "Expand the brackets fully. Re-entering (x+3)^2 or (x+3)(x+3) is not expanded.",
    };
  }

  if (expressionsEquivalent(expected, raw)) {
    return {
      completion: true,
      correctness: true,
      message: "Correct!",
    };
  }

  // Specific, helpful diagnosis for the pack's signature error.
  if (expressionsEquivalent("x^2 + 9", raw)) {
    return {
      completion: true,
      correctness: false,
      message:
        "You wrote x^2 + 9. The middle term 6x is missing. Remember (a+b)^2 = a^2 + 2ab + b^2.",
    };
  }

  return {
    completion: true,
    correctness: false,
    message: "Not quite. Check the middle term and the constant.",
  };
}

export type BoardTaskGrade = {
  correct: boolean;
  hitRegions: string[];
  message: string;
};

/**
 * Grade the pack's 2bx board task by template element IDs.
 * The student must select/activate every required region.
 */
export function gradeBoardTask(
  requiredElementIds: string[],
  selectedElementIds: string[],
): BoardTaskGrade {
  const hitRegions = requiredElementIds.filter((id) =>
    selectedElementIds.includes(id),
  );
  const correct = hitRegions.length === requiredElementIds.length;

  if (correct) {
    return {
      correct: true,
      hitRegions,
      message: "Both 2bx regions selected. Great!",
    };
  }

  const missing = requiredElementIds.filter(
    (id) => !selectedElementIds.includes(id),
  );
  return {
    correct: false,
    hitRegions,
    message: `You selected ${hitRegions.length} of ${requiredElementIds.length} regions. Missing: ${missing.join(", ")}.`,
  };
}
