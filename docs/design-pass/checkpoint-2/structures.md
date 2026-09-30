# Checkpoint 2: homepage structures, ranked before the roll

Fixed by checkpoint 1: Archivo (type set A), Newsprint paper, the live ledger
hero, the chrome rules, and the approved content order (hero, how the ledger is
built, where the numbers come from, what the client receives, plans, built by a
rental investor, eight questions, close). The directions differ in composition
and rhythm inside that order.

Ranked by resonance with agents who screen listings for investor clients, most
arriving on a phone from paid ads (written before running
`impeccable concept-seed --scope surface --mode persuade --candidate-count 7`):

1. **The worksheet.** One continuous ruled sheet from the hero to the close.
   Headings and notes live in a left margin column, every section is rows in
   the same grid, and section breaks are heavy rules rather than bands of
   space.
2. **Pinned ledger, moving notes.** On desktop the hero ledger stays pinned in
   the right column while the walkthrough scrolls on the left, each note
   banding the row it explains; on phones the notes interleave under the rows.
3. **Loan-estimate questions.** After the hero the page is a run of
   question-headed tables in the Loan Estimate grammar ("Does it fit the
   client?", "What is the most the client should pay?", "Where did each number
   come from?", "What does the client receive?", "What does it cost?"), each
   answered in a two-column table with bold answers.
4. **The memo as the spine.** The page is laid out like the decision memo the
   client receives: the hero as its cover, then the memo's own sections in a
   narrow reading column, with wide exhibits (the ledger, the source table, the
   memo page, the plan cards) breaking out.
5. **The expandable ledger.** The walkthrough is the hero ledger's own rows
   opening in place, each row a disclosure showing its source and arithmetic;
   everything after it is short and dense.
6. **Facing pages.** Every section is a two-column spread: what the agent does
   on the left, what the client receives on the right, with the ledger as the
   shared object between them.
7. **The day of the showing.** Sections follow the agent's day (at the
   listing, at the showing, after it, at the offer), alternating a phone-width
   exhibit with wide text.

## The roll

`impeccable concept-seed --scope surface --mode persuade --candidate-count 7`
(seed `d7607ac2`) dealt indices 5, 2 and 4: the expandable ledger, pinned
ledger with moving notes, and the memo as the spine. None of the three fails
audience identification or product clarity, so no re-roll. No image generation
is configured, so the three were drawn in code as artboards on the design
canvas (https://claude.ai/artifact/Y5VY45ZXc4NBtrzr3qNUe6), each at 1280px and
375px (the phone page split into two halves because the canvas caps a frame at
8000px). Local renders of the same files are in `renders/`; `canvas.json` is the
canvas layout.

All three hold the approved brief: Archivo on Newsprint, the ledger hero with
the engine's sample-deal numbers, no eyebrows, no arrow suffixes, sentence case,
cards only for the three plans, and the copy pass's strings (the hero subhead
as of de81b02). Measured at 375×812 and 390×844, the investor cue ends at 690px
in every direction; at 375×667 the primary action ends at 547px, above the
cookie bar.
