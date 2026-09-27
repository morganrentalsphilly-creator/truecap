# TrueCap author

The author of every page on usetruecap.com is the TrueCap Organization. This file is the human-editable copy of the byline and the bio. The founder can edit the Bio below at any time; `lib/__tests__/author-byline-bio.test.tsx` then fails until `AUTHOR_BIO` in `lib/author.ts` says the same thing, so /about, every blog post and every /vs page always show one text.

## Byline

By TrueCap · built by a Philadelphia rental investor

## Bio

TrueCap is built by one person, a rental investor in Philadelphia. It started as the tool he wanted for his own underwriting — a way to get from an address to a source-labeled first-pass answer in about a minute — and it's still how he runs the deals he considers.

## Rules

- Never name the founder: not on the site, in schema, docs, tests or fixtures.
- The author is the TrueCap Organization. Article JSON-LD `author` is the Organization `@id` (`/#organization`); there is no Person node.
- The bio on posts and /vs pages must equal the Bio above, word for word. No other bio, and no credentials, years of experience, deal counts or first-person experience claims beyond what the Byline and Bio already say.
- Edit this file and `lib/author.ts` together: the Byline is `By TrueCap · ` plus `AUTHOR_BYLINE_SUFFIX`, and the Bio is `AUTHOR_BIO`.
