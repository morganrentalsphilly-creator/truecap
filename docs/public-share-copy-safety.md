# Public-share copy safety

Durable copy is intentionally available only from a live opaque `/s/[token]`
share whose owner included the property address.

When a recipient selects **Copy this analysis to your account**, the server:

1. requires a current authenticated session;
2. validates and re-resolves the opaque capability so revocation, expiry, and
   methodology compatibility are checked at click time;
3. rejects a share whose address was hidden;
4. passes only released analysis inputs to the existing save boundary, which
   rechecks validation, feature availability, plan access, and saved-analysis
   capacity and recomputes the result server-side;
5. derives a one-way, recipient-scoped operation digest and relies on a unique
   database constraint so retries/concurrent deliveries return the first saved
   row instead of inserting duplicate scenarios; the raw share token and source
   row/account ids are never stored in the recipient record;
6. inserts a new recipient-owned scenario without a source analysis id, owner
   id, financing-profile link, notes, documents, comps, or lead data; and
7. records `shared_analysis_copied` only after a durable copy exists, with the
   sole event property `referral_source: opaque_share` and a deterministic,
   privacy-safe event UUID so provider retries deduplicate.

Captured price-ceiling criteria may be copied, but their source is reclassified
as recipient-owned `selected-targets`; the sender's Buy Box attribution is not
carried over.

Legacy `/d/[encoded]` links remain run-only because they are stateless and
cannot provide a current revocation check. Portal deal views also remain
run-only because they represent a separate scoped collaboration surface, not a
general public copy capability. Hidden-address `/s` shares offer only **Run
these assumptions with a property you choose** so a copied record cannot reveal
or fabricate the withheld identity.
