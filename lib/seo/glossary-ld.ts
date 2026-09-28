/**
 * The glossary's one DefinedTermSet (F4): the /glossary hub declares it with
 * this @id, and every DefinedTerm (the hub's list and each /glossary/<slug>
 * page) points at it through `inDefinedTermSet`, so crawlers read one set
 * with its terms instead of two differently named sets without an @id.
 *
 * Pure: no React, no server-only.
 */

export const GLOSSARY_TERM_SET_NAME = "TrueCap Real Estate Glossary";

export function glossaryTermSetId(siteUrl: string): string {
  return `${siteUrl}/glossary#terms`;
}

/** The `inDefinedTermSet` value of a DefinedTerm: a reference to the hub's set. */
export function glossaryTermSetRef(siteUrl: string) {
  return {
    "@type": "DefinedTermSet",
    "@id": glossaryTermSetId(siteUrl),
    name: GLOSSARY_TERM_SET_NAME,
    url: `${siteUrl}/glossary`,
  };
}
