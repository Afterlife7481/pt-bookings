import { splitTextWithLinks } from "@/lib/utils";

export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = splitTextWithLinks(text);

  return (
    <p className={className}>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noreferrer"
            className="break-all text-blue-600 underline hover:text-blue-800"
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}
