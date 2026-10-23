'use client';
// localized-jsx
import {tr} from './i18n';
import {useEffect,useState} from 'react';
export function useStored<T>(key:string,initial:T){const [value,setValue]=useState(initial),[ready,setReady]=useState(false);useEffect(()=>{try{const v=localStorage.getItem(key);if(v)setValue(JSON.parse(v))}catch{}setReady(true)},[key]);useEffect(()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new CustomEvent('deen-data'))}catch{}},[key,value,ready]);return [value,setValue,ready] as const}
export function useContent<T>(url:string){const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);useEffect(()=>{const c=new AbortController();setError('');setData(null);fetch(url,{signal:c.signal}).then(r=>{if(!r.ok)throw Error('Content could not be loaded. Please try again.');return r.json()}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>c.abort()},[url,retry]);return {data,error,retry:()=>setRetry(n=>n+1)}}
export function Loading({error,retry}:{error:string,retry:()=>void}){return <div className="empty" role="status"><h3>{tr(error||'Opening your reading space…')}</h3>{tr(error&&<button className="btn secondary" onClick={retry}>{" "}{tr("Try again")}{" "}</button>)}</div>}
export function Heading({label,title,children}:{label:string,title:string,children?:React.ReactNode}){return <div className="section-title"><div><span className="eyebrow">{tr(label)}</span><h1 className="feature-heading">{tr(title)}</h1>{tr(children&&<p>{tr(children)}</p>)}</div></div>}
export function route(path:string){window.location.hash=path;window.scrollTo({top:0,behavior:'instant'})}
export function normalize(text:string){return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا')}
export function copyText(text:string,notify:(text:string)=>void){navigator.clipboard?.writeText(text).then(()=>notify('Copied to clipboard')).catch(()=>notify('Clipboard is unavailable in this browser.'))}
export type Chapter={id:number,name:string,arabic:string,meaning:string,count:number,revelation:string,offset:number};
export type Verse={id:number,global:number,arabic:string,en:string,enNotes:string,ur:string,urNotes:string};
export type QuranIndex={chapters:Chapter[],juz:{surah:number,ayah:number}[]};
export type QuranChapter={chapter:Chapter,verses:Verse[]};
export type Reading={surah:number,ayah:number,name:string,updated:string};
export type SavedVerse={surah:number,ayah:number,label:string};
export function QuranCredit(){return <p className="content-credit">{" "}{tr("Text & translations:")}{" "}<a href="https://quranenc.com/en/home/api" target="_blank" rel="noreferrer">{" "}{tr("QuranEnc.com ↗")}{" "}</a>{" "}{tr("· English: Noor International Center, v1.1.2 · Urdu: Muhammad Ibrahim Junagarhi, v1.1.3. Text and footnotes preserved. Downloaded 23 October 2026.")}{" "}</p>}

// spaced-jsx
