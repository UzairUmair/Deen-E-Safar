"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { tr } from "../../features/i18n";
import { AnimatedButton } from "../motion/AnimatedButton";
import type { HomeBook } from "./content";

/**
 * DOM side of the bookshelf: a keyboard- and touch-friendly list of the same books
 * shown in 3D, plus the information panel for the selected one. It is the whole
 * interaction when WebGL is unavailable.
 */
export function InteractiveBookshelf({
  books,
  hovered,
  selected,
  onHover,
  onSelect,
  go,
}: {
  books: HomeBook[];
  hovered: string | null;
  selected: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  go: (page: string) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const book = books.find((b) => b.id === selected);
  const announced = books.find((b) => b.id === (hovered || selected));

  useEffect(() => {
    if (!selected) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSelect(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected, onSelect]);

  return (
    <div className="shelf-ui">
      <p className="sr-only" aria-live="polite">
        {announced ? tr(announced.label) : ""}
      </p>
      {book && (
        <div className="book-panel" ref={panel} role="region" aria-label={tr(book.label)}>
          <span className="book-swatch" style={{ background: book.color }} aria-hidden="true" />
          <div>
            <span className="home-eyebrow">{tr("FROM THE SHELF")}</span>
            <h3>{tr(book.label)}</h3>
            <p>{tr(book.description)}</p>
            {book.route ? (
              <AnimatedButton size="sm" arrow onClick={() => go(book.route!)}>
                {tr(book.action)}
              </AnimatedButton>
            ) : (
              <span className="soon-badge">{tr("Coming soon")}</span>
            )}
          </div>
          <button type="button" className="icon-button book-panel-close" aria-label={tr("Close")} onClick={() => onSelect(null)}>
            <X size={18} />
          </button>
        </div>
      )}
      <ul className="book-chips" aria-label={tr("Books on the shelf")}>
        {books.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              className={hovered === b.id || selected === b.id ? "active" : ""}
              aria-pressed={selected === b.id}
              onPointerEnter={(e) => e.pointerType === "mouse" && onHover(b.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(b.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(selected === b.id ? null : b.id)}
            >
              <i style={{ background: b.color }} aria-hidden="true" />
              {tr(b.label)}
              {!b.route && <small>{tr("Soon")}</small>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
