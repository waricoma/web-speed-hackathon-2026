import { createElement, lazy, memo, Suspense, useEffect, useMemo, useState } from "react";

import { TypingIndicator } from "@web-speed-hackathon-2026/client/src/components/crok/TypingIndicator";
import { CrokLogo } from "@web-speed-hackathon-2026/client/src/components/foundation/CrokLogo";

// Lazy load the heavy markdown renderer (react-markdown + rehype-katex + remark-gfm + syntax-highlighter)
const RichMarkdown = lazy(() => import("@web-speed-hackathon-2026/client/src/components/crok/RichMarkdown").then((m) => ({ default: m.RichMarkdown })));

// Check if content needs rich rendering (code blocks, math, tables)
function needsRichRendering(content: string): boolean {
  return /```|^\|.*\|/m.test(content) || /\$\$|\\\[|\\\(/.test(content);
}

interface Props {
  message: Models.ChatMessage;
  isStreaming?: boolean;
}

const UserMessage = ({ content }: { content: string }) => {
  return (
    <div className="mb-6 flex justify-end">
      <div className="bg-cax-surface-subtle text-cax-text max-w-[80%] rounded-3xl px-4 py-2">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
};

// Lightweight markdown: render headings as proper elements (for a11y/test selectors), rest as plain text
const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;

const LightMarkdown = ({ content }: { content: string }) => {
  // Fast path: no headings
  if (!content.includes("#")) {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  HEADING_RE.lastIndex = 0;

  while ((match = HEADING_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      result.push(<span key={`t${lastIndex}`}>{content.slice(lastIndex, match.index)}</span>);
    }
    const level = match[1]!.length;
    result.push(createElement(`h${level}`, { key: `h${match.index}` }, match[2]));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    result.push(<span key={`t${lastIndex}`}>{content.slice(lastIndex)}</span>);
  }

  return <div className="whitespace-pre-wrap">{result}</div>;
};

// Memoized stable block that won't re-render once content is set
const StableBlock = memo(({ content }: { content: string }) => {
  return <LightMarkdown content={content} />;
});

/**
 * Split content into "stable" blocks (completed paragraphs separated by double newlines)
 * and a "tail" block (the last in-progress paragraph).
 * Only the tail re-renders on each SSE update; stable blocks are memoized.
 */
function splitStableAndTail(content: string): { stableBlocks: string[]; tail: string } {
  const parts = content.split("\n\n");
  if (parts.length <= 1) {
    return { stableBlocks: [], tail: content };
  }
  return {
    stableBlocks: parts.slice(0, -1),
    tail: parts[parts.length - 1]!,
  };
}

const AssistantMessage = ({ content, isLastMessage, isStreaming }: { content: string; isLastMessage: boolean; isStreaming: boolean }) => {
  // Only enable RichMarkdown AFTER streaming is complete (avoid re-parsing 13KB markdown 15x during stream)
  const isStreamingThis = isLastMessage && isStreaming;
  const [useRich, setUseRich] = useState(false);

  useEffect(() => {
    if (!content || isStreamingThis) {
      setUseRich(false);
      return;
    }
    if (needsRichRendering(content)) {
      const timer = setTimeout(() => setUseRich(true), 100);
      return () => clearTimeout(timer);
    }
  }, [content, isStreamingThis]);

  // Split into stable (memo'd) and tail (re-rendered) blocks during streaming
  const { stableBlocks, tail } = useMemo(() => splitStableAndTail(content), [content]);

  return (
    <div className="mb-6 flex gap-4">
      <div className="h-8 w-8 shrink-0">
        <CrokLogo className="h-full w-full" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-cax-text mb-1 text-sm font-medium">Crok</div>
        <div className="markdown text-cax-text max-w-none">
          {content ? (
            useRich && !isStreamingThis ? (
              <Suspense fallback={<LightMarkdown content={content} />}>
                <RichMarkdown content={content} />
              </Suspense>
            ) : (
              <>
                {stableBlocks.map((block, i) => (
                  <StableBlock key={i} content={block} />
                ))}
                <LightMarkdown content={tail} />
              </>
            )
          ) : (
            <TypingIndicator />
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessage = memo(({ message, isStreaming = false }: Props) => {
  if (message.role === "user") {
    return <UserMessage content={message.content} />;
  }
  return <AssistantMessage content={message.content} isLastMessage={true} isStreaming={isStreaming} />;
});
