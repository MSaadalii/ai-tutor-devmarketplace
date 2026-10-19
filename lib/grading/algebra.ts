/**
 * Pack algebra grading — expand with mathjs fixtures in Taha lane.
 * Placeholder API so UI can import a stable module path.
 */

export type AlgebraGrade = {
  completion: boolean;
  correctness: boolean;
  message?: string;
};

export function gradeBinomialExpansion(
  expected: string,
  student: string,
): AlgebraGrade {
  void expected;
  void student;
  return {
    completion: false,
    correctness: false,
    message: "Grading not implemented yet — Taha lane.",
  };
}
