import type { MetadataRoute } from "next";

const BASE = "https://www.imperialstargems.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/natural-diamonds", priority: 0.9 },
    { path: "/lab-grown-diamonds", priority: 0.9 },
    { path: "/shapes", priority: 0.8 },
    { path: "/craftsmanship", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority,
  }));
}
