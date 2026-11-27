import type { Metadata } from "next";

// Per-page metadata for public marketing pages. Each page gets its own
// description and Open Graph tags so Google does not read it as a copy of
// the homepage and pick a different canonical than the one we declare.
// Child openGraph replaces the root one entirely, so type is set here too.
export function pageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
  };
}
