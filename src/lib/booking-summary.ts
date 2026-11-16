export const SUMMARY_LIMIT = 1800;
export function validSummary(summary: unknown, approved: unknown): boolean {
  return summary === undefined || summary === "" ||
    (typeof summary === "string" && summary.trim().length > 0 && summary.length <= SUMMARY_LIMIT && approved === true);
}
