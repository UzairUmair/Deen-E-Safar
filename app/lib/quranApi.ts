// Provider adapter: Al Quran Cloud REST API (https://alquran.cloud/api).
// Nothing outside this file knows the provider's URL scheme or payload shape.
import { ApiError, getJson, invalid } from "./apiClient";
import { isInt, isRecord, isString } from "./validation";
import type { EditionInfo, JuzStart, SearchMatch, SurahSummary } from "../services/quran/types";

const BASE = "https://api.alquran.cloud/v1";
const AUDIO_CDN = "https://cdn.islamic.network/quran/audio/128";

export const QURAN_PROVIDER = { name: "Al Quran Cloud", url: "https://alquran.cloud", terms: "https://alquran.cloud/terms-and-conditions" };

export type RawAyah = { number: number; numberInSurah: number; text: string; juz: number; sajda: boolean };
export type RawSurahEdition = { edition: EditionInfo; surah: SurahSummary; ayahs: RawAyah[] };

type Options = { signal?: AbortSignal };

async function data(path: string, options: Options): Promise<unknown> {
  const body = await getJson(`${BASE}${path}`, options);
  if (!isRecord(body) || body.code !== 200 || !("data" in body)) invalid("Unexpected envelope");
  return (body as Record<string, unknown>).data;
}

function revelation(value: unknown): SurahSummary["revelation"] {
  return value === "Meccan" || value === "Medinan" ? value : invalid("Unknown revelation type");
}

export function parseSurahSummary(raw: unknown): SurahSummary {
  if (!isRecord(raw) || !isInt(raw.number, 1, 114) || !isString(raw.name) || !isString(raw.englishName) || !isString(raw.englishNameTranslation) || !isInt(raw.numberOfAyahs, 1, 286)) return invalid("Malformed surah");
  return { number: raw.number, arabicName: raw.name, englishName: raw.englishName, englishMeaning: raw.englishNameTranslation, ayahCount: raw.numberOfAyahs, revelation: revelation(raw.revelationType) };
}

export function parseEdition(raw: unknown): EditionInfo {
  if (!isRecord(raw) || !isString(raw.identifier) || !isString(raw.englishName) || !isString(raw.language)) return invalid("Malformed edition");
  return {
    identifier: raw.identifier,
    name: isString(raw.name) ? raw.name : raw.englishName,
    englishName: raw.englishName,
    language: raw.language,
    direction: raw.direction === "rtl" ? "rtl" : "ltr",
    format: isString(raw.format) ? raw.format : "text",
    type: isString(raw.type) ? raw.type : "",
  };
}

function parseAyah(raw: unknown): RawAyah {
  if (!isRecord(raw) || !isInt(raw.number, 1, 6236) || !isInt(raw.numberInSurah, 1, 286) || !isString(raw.text)) return invalid("Malformed ayah");
  // `sajda` is `false` or an object describing the prostration.
  // The provider prefixes some texts with a byte-order mark; it is not part of the verse.
  return { number: raw.number, numberInSurah: raw.numberInSurah, text: raw.text.replace(/^\uFEFF/, ""), juz: isInt(raw.juz, 1, 30) ? raw.juz : 0, sajda: !!raw.sajda };
}

export function parseSurahEdition(raw: unknown): RawSurahEdition {
  if (!isRecord(raw) || !Array.isArray(raw.ayahs)) return invalid("Malformed surah edition");
  return { edition: parseEdition(raw.edition), surah: parseSurahSummary(raw), ayahs: raw.ayahs.map(parseAyah) };
}

export async function fetchSurahList(options: Options = {}): Promise<SurahSummary[]> {
  const raw = await data("/surah", options);
  if (!Array.isArray(raw) || raw.length !== 114) invalid("Expected 114 surahs");
  return (raw as unknown[]).map(parseSurahSummary);
}

/** One request for the same surah in several editions (Arabic first, then translations). */
export async function fetchSurahEditions(surah: number, editions: string[], options: Options = {}): Promise<RawSurahEdition[]> {
  const raw = await data(`/surah/${surah}/editions/${editions.join(",")}`, options);
  if (!Array.isArray(raw) || raw.length !== editions.length) invalid("Missing edition in response");
  const parsed = (raw as unknown[]).map(parseSurahEdition);
  // The provider answers in request order; make sure, rather than assume.
  editions.forEach((id, i) => {
    if (parsed[i].edition.identifier !== id || parsed[i].surah.number !== surah) invalid(`Edition ${id} was not returned for surah ${surah}`);
  });
  return parsed;
}

export type RawAyahEdition = { edition: EditionInfo; surah: SurahSummary; ayah: RawAyah };

export async function fetchAyahEditions(surah: number, ayah: number, editions: string[], options: Options = {}): Promise<RawAyahEdition[]> {
  const raw = await data(`/ayah/${surah}:${ayah}/editions/${editions.join(",")}`, options);
  if (!Array.isArray(raw) || raw.length !== editions.length) invalid("Missing edition in response");
  return (raw as unknown[]).map((item, i) => {
    if (!isRecord(item)) return invalid("Malformed ayah edition");
    const parsed = { edition: parseEdition(item.edition), surah: parseSurahSummary(item.surah), ayah: parseAyah(item) };
    if (parsed.edition.identifier !== editions[i] || parsed.surah.number !== surah || parsed.ayah.numberInSurah !== ayah) invalid("Ayah reference mismatch");
    return parsed;
  });
}

export async function fetchEditionsForLanguage(language: string, options: Options = {}): Promise<EditionInfo[]> {
  const raw = await data(`/edition/language/${language}`, options);
  if (!Array.isArray(raw)) invalid("Malformed edition list");
  return (raw as unknown[]).map(parseEdition);
}

export async function fetchJuzStarts(options: Options = {}): Promise<JuzStart[]> {
  const raw = await data("/meta", options);
  const references = isRecord(raw) && isRecord(raw.juzs) ? raw.juzs.references : null;
  if (!Array.isArray(references) || references.length !== 30) invalid("Malformed juz metadata");
  return (references as unknown[]).map((ref, i) => {
    if (!isRecord(ref) || !isInt(ref.surah, 1, 114) || !isInt(ref.ayah, 1, 286)) return invalid("Malformed juz reference");
    return { juz: i + 1, surah: ref.surah, ayah: ref.ayah };
  });
}

/** Keyword search inside one edition. The provider answers 404 when nothing matches. */
export async function searchEdition(keyword: string, edition: string, options: Options = {}): Promise<{ total: number; matches: SearchMatch[] }> {
  let raw: unknown;
  try {
    raw = await data(`/search/${encodeURIComponent(keyword)}/all/${edition}`, options);
  } catch (error) {
    if (error instanceof ApiError && error.kind === "not-found") return { total: 0, matches: [] };
    throw error;
  }
  if (!isRecord(raw) || !Array.isArray(raw.matches)) return invalid("Malformed search result");
  const matches = (raw.matches as unknown[]).map((match): SearchMatch => {
    if (!isRecord(match) || !isString(match.text) || !isInt(match.numberInSurah, 1, 286) || !isRecord(match.surah) || !isInt(match.surah.number, 1, 114)) return invalid("Malformed search match");
    return { surah: match.surah.number, ayah: match.numberInSurah, text: match.text, surahName: isString(match.surah.englishName) ? match.surah.englishName : "", surahArabicName: isString(match.surah.name) ? match.surah.name : "" };
  });
  return { total: isInt(raw.count, 0, 100000) ? raw.count : matches.length, matches };
}

/** Verse-by-verse recitation file on the Islamic Network CDN (global ayah number 1–6236). */
export function ayahAudioUrl(reciter: string, globalAyahNumber: number) {
  return `${AUDIO_CDN}/${reciter}/${globalAyahNumber}.mp3`;
}
