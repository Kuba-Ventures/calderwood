import type { MetadataRoute } from "next";

const SITE = "https://newfeeschedule.com";

// Public marketing pages only. App routes and report links stay out.
const PATHS = [
  "",
  "/features",
  "/how-it-works",
  "/pricing",
  "/sample-report",
  "/resources",
  "/privacy",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${SITE}${path}` }));
}
