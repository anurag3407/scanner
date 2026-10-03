"use client";

import React, { useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

/**
 * An owner-pasted dish photo. Rendered as a plain <img> because the URL is
 * arbitrary and user-supplied (next/image would need every remote host
 * pre-registered). A broken link degrades to nothing rather than showing the
 * browser's broken-image icon on a diner's phone.
 *
 * Pass `key={src}` at the usage site: remounting on a new link resets the
 * failure state without effects or cascading renders.
 */
export default function MenuItemImage({ src, alt, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`border-2 border-black bg-cream object-cover shadow-neo-xs ${className ?? ""}`}
    />
  );
}
