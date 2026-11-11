import type { CSSProperties, ImgHTMLAttributes } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  unoptimized?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  sizes?: string;
};

// Remplace next/image : une simple balise img (les photos des personnes viennent de la base, voir images.ts).
export default function Image({ src, fill, unoptimized, priority, quality, placeholder, style, ...rest }: ImageProps) {
  void unoptimized;
  void priority;
  void quality;
  void placeholder;
  const filled: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }
    : undefined;
  return <img {...rest} src={typeof src === "string" ? src : src.src} style={{ ...filled, ...style }} />;
}
