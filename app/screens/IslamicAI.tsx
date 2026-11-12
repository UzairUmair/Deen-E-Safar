"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Loader2, Send, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeading } from "../components/ui/states";
import { apiErrorMessage } from "../lib/apiClient";
import { askAssistant, assistantProvider, MIN_QUERY_LENGTH, type AssistantReply, type Citation } from "../services/ai/aiService";

type Message = { id: number; role: "user"; text: string } | { id: number; role: "assistant"; question: string; status: "loading" | "done" | "error"; reply?: AssistantReply; error?: unknown };

// Single words and short phrases: the current provider matches text literally.
const SUGGESTIONS = ["patience", "mercy", "parents", "gratitude", "knowledge", "forgiveness"];

export function CitationCard({ citation }: { citation: Citation }) {
  const { t } = useTranslation();
  return (
    <a className="citation-card" href={citation.href} {...(citation.external ? { target: "_blank", rel: "noreferrer" } : {})}>
      <span className="citation-kind">
        <BookOpen size={15} aria-hidden="true" />
        {citation.kind === "quran" ? t("Quran") : t("Hadith")}
      </span>
      <strong>{citation.reference}</strong>
      {citation.arabic && (
        <span className="citation-arabic notranslate" lang="ar" dir="rtl" translate="no">
          {citation.arabic}
        </span>
      )}
      {citation.excerpt && <span className="citation-excerpt">{citation.excerpt}</span>}
      <small>
        {citation.external ? t("Read original source") : t("Read in context")}
        <ArrowUpRight size={13} aria-hidden="true" />
      </small>
    </a>
  );
}

function AssistantMessage({ message, onRetry }: { message: Extract<Message, { role: "assistant" }>; onRetry: () => void }) {
  const { t } = useTranslation();
  if (message.status === "loading") {
    return (
      <div className="chat-bubble assistant" role="status">
        <Loader2 size={16} className="spin" aria-hidden="true" />
        {t("Searching the sources…")}
      </div>
    );
  }
  if (message.status === "error") {
    return (
      <div className="chat-bubble assistant" role="alert">
        <p>{t(apiErrorMessage(message.error))}</p>
        <button type="button" className="chip" onClick={onRetry}>
          {t("Try again")}
        </button>
      </div>
    );
  }
  const reply = message.reply!;
  return (
    <div className="chat-bubble assistant">
      {reply.mode === "source-search" ? (
        <>
          <span className="reply-label">{t("Source search results — not an AI answer")}</span>
          <p>{reply.citations.length ? t("Passages in the bundled Quran and Hadith collection that contain “{{query}}”:", { query: reply.query }) : t("No passage in the bundled Quran and Hadith collection contains “{{query}}”. Try a single word or a shorter phrase.", { query: reply.query })}</p>
        </>
      ) : (
        <p>{reply.text}</p>
      )}
      {reply.citations.length > 0 && (
        <div className="citation-list">
          {reply.citations.map((citation) => (
            <CitationCard key={citation.href + citation.reference} citation={citation} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Assistant screen. Until a live provider is connected it runs a labelled source search only. */
export default function IslamicAI() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const controller = useRef<AbortController | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const busy = messages.some((m) => m.role === "assistant" && m.status === "loading");

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [messages]);

  async function run(question: string, id: number) {
    controller.current?.abort();
    const current = (controller.current = new AbortController());
    const update = (patch: Partial<Extract<Message, { role: "assistant" }>>) => setMessages((list) => list.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...patch } : m)));
    update({ status: "loading", error: undefined });
    try {
      const reply = await askAssistant(question, { language: i18n.language, signal: current.signal });
      if (!current.signal.aborted) update({ status: "done", reply });
    } catch (error) {
      if (!current.signal.aborted) update({ status: "error", error });
    }
  }

  function ask(text: string) {
    const question = text.trim();
    if (question.length < MIN_QUERY_LENGTH || busy) return;
    const id = nextId.current;
    nextId.current += 2;
    setMessages((list) => [...list, { id, role: "user", text: question }, { id: id + 1, role: "assistant", question, status: "loading" }]);
    setDraft("");
    run(question, id + 1);
  }

  return (
    <div className="app-screen ai-screen">
      <PageHeading eyebrow={t("ISLAMIC AI ASSISTANT")} title={t("Islamic AI Assistant — Live answers coming soon.")}>
        {t("The assistant is not connected to a language model yet, so it does not write answers or give rulings. For now it searches the bundled Quran and Hadith texts for the words you type and shows the matching passages.")}
      </PageHeading>

      <section className="chat" aria-label={t("Conversation")}>
        <div className="chat-status">
          <Sparkles size={16} aria-hidden="true" />
          <span>{assistantProvider.live ? t("Live assistant") : t("Source search mode")}</span>
        </div>
        <div className="chat-thread" ref={thread} aria-live="polite">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <h2>{t("Search a topic")}</h2>
              <p>{t("Pick a word below or type your own. Results link to the passage so you can read it in context.")}</p>
              <div className="chip-row">
                {SUGGESTIONS.map((word) => (
                  <button key={word} type="button" className="chip" onClick={() => ask(i18n.language === "en" ? word : t(word))}>
                    {t(word)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) =>
              message.role === "user" ? (
                <p key={message.id} className="chat-bubble user">
                  {message.text}
                </p>
              ) : (
                <AssistantMessage key={message.id} message={message} onRetry={() => run(message.question, message.id)} />
              ),
            )
          )}
        </div>
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <label className="sr-only" htmlFor="chat-input">
            {t("Word or phrase to search")}
          </label>
          <input id="chat-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("Type a word or phrase, e.g. patience")} minLength={MIN_QUERY_LENGTH} maxLength={120} autoComplete="off" />
          <button type="submit" className="btn" disabled={busy || draft.trim().length < MIN_QUERY_LENGTH}>
            <Send size={16} aria-hidden="true" />
            {t("Search")}
          </button>
        </form>
        <p className="fine-print">{t("Results are literal text matches, not a complete answer to a question. For personal religious rulings, consult a qualified scholar.")}</p>
      </section>
    </div>
  );
}
