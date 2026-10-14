import { useEffect } from "react";
import { startHighlightQueue } from "./highlightUploads";

export default function HighlightUploadStatus() {
  useEffect(() => {
    const stopQueue = startHighlightQueue();

    return () => {
      stopQueue();
    };
  }, []);

  return null;
}