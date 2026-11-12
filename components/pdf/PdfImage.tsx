import clsx from "clsx";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Photo } from "@/lib/types";

interface PdfImageProps {
  photo: Photo;
  className?: string;
  fit?: "cover" | "contain";
}

/** PDF 里的照片：发丝线框 + 4% 投影（DEV_SPEC 4.10.2） */
export function PdfImage({ photo, className, fit = "cover" }: PdfImageProps) {
  return (
    <div className={clsx("pdf-photo", className)}>
      <SmartImage photo={photo} fill sizes="1600px" fit={fit} priority />
    </div>
  );
}
