import {createContext,useContext} from 'react';
import translations from './translations.json';
export type Language='en'|'ur'|'ar';
export const LanguageContext=createContext<string>('en');
export function useSiteLanguage(){return useContext(LanguageContext)}
let language:Language='en';
export function setLanguage(value:string){language=value==='ur'||value==='ar'?value:'en'}
export function getLanguage(){return language}
const dictionary=translations as Record<string,string[]>;
export function tr<T>(value:T):T{if(language==='en'||typeof value!=='string')return value;const text=value.replace(/\s+/g,' ').trim();const found=dictionary[text];if(found)return found[language==='ur'?0:1] as T;
 const patterns:[RegExp,(m:RegExpMatchArray)=>string][]=[
 [/^Welcome, (.+)$/,m=>language==='ur'?`خوش آمدید، ${m[1]}`:`مرحبًا، ${m[1]}`],
 [/^Continue (.+)$/,m=>`${tr('Continue reading')} · ${tr(m[1])}`],
 [/^(Play|Bookmark|Copy) verse (\d+)$/,m=>`${tr(m[1])} ${tr('Verse')} ${m[2]}`],
 [/^Listen from verse (\d+)$/,m=>`${tr('Listen from verse')} ${m[1]}`],
 [/^Reading position saved at (.+)$/,m=>`${tr('Reading position saved')} ${m[1]}`],
 [/^(\d+) matches$/,m=>`${m[1]} ${tr('matches')}`],
 [/^(\d+) of (\d+) completed$/,m=>`${m[1]} / ${m[2]} ${tr('completed')}`],
 [/^(\w+) in (\d+)h (\d+)m$/,m=>`${tr(m[1])} · ${m[2]} ${tr('hours')} ${m[3]} ${tr('minutes')}`],
 [/^Save Hadith (\d+)$/,m=>`${tr('Save Hadith')} ${m[1]}`],
 [/^Save (.+)$/,m=>`${tr('Save')} ${tr(m[1])}`],
 [/^Copy (.+)$/,m=>`${tr('Copy')} ${tr(m[1])}`],
 [/^Open (.+)$/,m=>`${tr('Open')} ${tr(m[1])}`],
 [/^(.+?) (\d+:\d+)$/,m=>`${tr(m[1])} ${m[2]}`],
 [/^Explore (.+)$/,m=>`${tr('Explore')} ${tr(m[1])}`]
 ];for(const [re,fn]of patterns){const m=text.match(re);if(m)return fn(m) as T}return value}

