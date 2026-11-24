/** A step's line of Java with the lines either side, cut on the server from the real file. */
export type Excerpt = { file: string; line: number; start: number; lines: string[] };

/** Lines shown either side of the current one. */
export const CONTEXT_LINES = 3;

const SHOWN = 2 * CONTEXT_LINES + 1;

/**
 * The excerpt for a step, with the current line marked by a bar, bold text and hidden text for
 * screen readers, not by colour alone. Keeps its height when a step has no source line.
 */
export function SourceExcerpt({ excerpt }: { excerpt: Excerpt | null }) {
  const height = { minHeight: `calc(${SHOWN} * 1.5em + 1rem)` };
  if (excerpt === null) {
    return (
      <div className="not-prose text-xs">
        <p className="mb-1 text-fd-muted-foreground">No line of code for this step.</p>
        <div className="rounded-md border border-dashed border-fd-border" style={height} />
      </div>
    );
  }
  return (
    <div className="not-prose text-xs">
      <p className="mb-1 text-fd-muted-foreground">
        <code className="font-mono">{excerpt.file}</code>, line {excerpt.line}
      </p>
      <pre
        className="overflow-x-auto rounded-md border border-fd-border bg-fd-secondary py-2 leading-normal"
        style={height}
      >
        <code>
          {excerpt.lines.map((text, i) => {
            const number = excerpt.start + i;
            const current = number === excerpt.line;
            return (
              <span
                key={number}
                data-current={current ? "true" : undefined}
                className={
                  current
                    ? "block border-l-4 border-fd-primary bg-fd-primary/10 pr-3 font-bold"
                    : "block border-l-4 border-transparent pr-3"
                }
              >
                {current ? <span className="sr-only">Current line: </span> : null}
                <span className="inline-block w-10 select-none pr-3 text-right text-fd-muted-foreground">
                  {number}
                </span>
                {text}
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
