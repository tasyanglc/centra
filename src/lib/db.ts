// Database is fully client-side using localStorage in actions.ts.
// This file is kept as a dummy to prevent any broken import references.
export const sql = async (...args: any[]) => {
  console.warn("SQL was called on client-side dummy db.ts", args);
  return [];
};
