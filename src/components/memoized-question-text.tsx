import React, { memo, useEffect } from "react";
import ReactMarkdown from "react-markdown";

declare global {
  interface Window {
    renderMathInElement: any;
  }
}

export const MemoizedQuestionText = memo(({ text, id, className }: { text: string, id: string, className?: string }) => {
  useEffect(() => {
    if (typeof window !== "undefined" && window.renderMathInElement) {
      const el = document.getElementById(id);
      if (el) {
        window.renderMathInElement(el, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\(", right: "\\)", display: false},
            {left: "\\[", right: "\\]", display: true}
          ],
          throwOnError: false
        });
      }
    }
  }, [text, id]);

  return (
    <div id={id} className={`prose dark:prose-invert max-w-none prose-p:my-1 prose-p:leading-relaxed ${className || ""}`}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
});

MemoizedQuestionText.displayName = "MemoizedQuestionText";
