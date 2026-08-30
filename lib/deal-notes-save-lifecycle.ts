export type QueuedDealNotesSave = {
  notes: string;
  expectedRevision: number;
};

export function isCurrentDealNotesSave(input: {
  submittedDealId: string;
  currentDealId: string | null;
  requestToken: symbol;
  currentRequestToken: symbol | null;
}): boolean {
  return (
    input.submittedDealId === input.currentDealId &&
    input.requestToken === input.currentRequestToken
  );
}

export function getQueuedDealNotesSave(input: {
  wasRequested: boolean;
  submittedNotes: string;
  currentNotes: string;
  returnedRevision: number;
}): QueuedDealNotesSave | null {
  if (!input.wasRequested || input.currentNotes === input.submittedNotes) {
    return null;
  }
  return {
    notes: input.currentNotes,
    expectedRevision: input.returnedRevision,
  };
}
