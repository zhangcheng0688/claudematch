// src/components/shared/MomentsImg.tsx
//
// Renders one of the moment-N images with the right format negotiation
// (AVIF → WebP → JPG) and srcset for retina. Falls back gracefully
// when the .avif / .webp variants haven't been generated yet — the
// <source> tags just don't match and the browser falls through to
// <img src=.jpg>.
//
// How it works:
//   1. We `import.meta.glob` all moment-*.* assets up front. Vite
//      statically analyzes the .jpg imports elsewhere in the codebase
//      and hashes them; the glob runs at build time and only includes
//      files that exist on disk. So if `optimize-images.mjs` hasn't
//      been run yet, only the .jpg entries show up.
//   2. The component looks up `${base}.avif` / `${base}.webp` in the
//      manifest. If found, it emits the <source>; if not, it skips.
//      Either way the <img> falls back to the .jpg URL we already
//      imported (so we never need a missing-asset path).
//
// Performance characteristics (P2-key-1):
//   - AVIF: ~30% smaller than WebP, ~50% smaller than JPG at q=55
//   - All images are 1x today; 2x variants are a future tweak.

import { useMemo } from "react";
import jpg1 from "@/assets/moment-1.jpg";
import jpg2 from "@/assets/moment-2.jpg";
import jpg3 from "@/assets/moment-3.jpg";
import jpg4 from "@/assets/moment-4.jpg";
import jpg5 from "@/assets/moment-5.jpg";
import jpg6 from "@/assets/moment-6.jpg";

// `eager: true` so the URL strings are in the bundle at build time.
// `{ import: "default" }` so the value is the URL string (not a module
// record object). The `/@/assets/` glob pattern matches whatever Vite
// serves these as; if the variants don't exist on disk, they're just
// absent from the record and the component falls back to .jpg.
const AVIF_URLS = import.meta.glob<string>("/src/assets/moment-*.avif", {
  eager: true,
  import: "default",
});
const WEBP_URLS = import.meta.glob<string>("/src/assets/moment-*.webp", {
  eager: true,
  import: "default",
});

const JPG_BY_BASE: Record<string, string> = {
  "moment-1": jpg1,
  "moment-2": jpg2,
  "moment-3": jpg3,
  "moment-4": jpg4,
  "moment-5": jpg5,
  "moment-6": jpg6,
};

function findVariant(
  manifest: Record<string, string>,
  base: string,
  ext: string,
): string | undefined {
  // Manifest keys are the full path Vite resolved: "/src/assets/moment-1.avif"
  // We match by suffix so we don't have to know the resolution strategy.
  const suffix = `/${base}.${ext}`;
  for (const key in manifest) {
    if (key.endsWith(suffix)) return manifest[key];
  }
  return undefined;
}

type Props = {
  /** e.g. "moment-1" (without extension). */
  base: keyof typeof JPG_BY_BASE;
  alt: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fetchpriority?: "high" | "low" | "auto";
  className?: string;
  width?: number;
  height?: number;
};

export function MomentsImg({
  base,
  alt,
  loading = "lazy",
  decoding = "async",
  fetchpriority,
  className,
  width = 1024,
  height = 1024,
}: Props) {
  // Memo so we don't re-glob on every render (the maps are stable but
  // we still avoid the property-lookup cost).
  const { avif, webp, jpg } = useMemo(() => {
    return {
      avif: findVariant(AVIF_URLS, base, "avif"),
      webp: findVariant(WEBP_URLS, base, "webp"),
      jpg: JPG_BY_BASE[base]!,
    };
  }, [base]);

  return (
    <picture>
      {avif && <source srcSet={avif} type="image/avif" />}
      {webp && <source srcSet={webp} type="image/webp" />}
      <img
        src={jpg}
        alt={alt}
        loading={loading}
        decoding={decoding}
        // @ts-expect-error fetchpriority is a valid HTML attr but not in React's types yet
        fetchpriority={fetchpriority}
        width={width}
        height={height}
        className={className}
      />
    </picture>
  );
}
