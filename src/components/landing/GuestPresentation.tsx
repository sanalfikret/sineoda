import {useTranslation} from 'react-i18next'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {api} from '../../api/client'
import {FeaturedShowcaseRow} from '../FeaturedShowcaseRow'
import {guestItemHref} from '../../utils/landingContentLinks'
import type {ContentItem} from '../../types/content'
export type Presentation={count:number;titleTr?:string;titleEn?:string;bodyTr?:string;bodyEn?:string;removed?:boolean;size?:'compact'|'normal'|'large';width:'normal'|'wide';align:'left'|'center'}
export const defaultPresentation:Presentation={count:8,width:'normal',align:'left'}
export const Context=createContext<Record<string,Presentation>>({})
export function GuestPresentationProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState<Record<string,Presentation>>({});useEffect(()=>{void api<Record<string,Presentation>>('/api/landing-presentation').then(setSettings).catch(()=>{})},[]);return <Context.Provider value={settings}>{children}</Context.Provider>}
export function GuestBlockFrame({id,children}:{id:string;children:ReactNode}){const settings=useContext(Context)[id]??defaultPresentation;if(settings.removed)return null;return <div className={(settings.width==='wide'?'max-w-7xl':'max-w-5xl')+' mx-auto w-full min-w-0 px-4 [&_section]:max-w-none [&_.max-w-5xl]:max-w-none '+(settings.size==='compact'?'[&_section]:py-2 [&_section]:px-0':settings.size==='large'?'[&_section]:py-12 [&_section]:px-0':'[&_section]:px-0')+' '+(settings.align==='center'?'text-center [&_.text-left]:text-center':'text-left [&_.text-center]:text-left')}>{children}</div>}
export function GuestGrid({id,title,items,href}:{id:string;title:string;items:ContentItem[];href?:string}){const settings=useContext(Context)[id]??defaultPresentation;const {i18n}=useTranslation();const heading=(i18n.language.startsWith('en')?settings.titleEn:settings.titleTr)||title;return <GuestBlockFrame id={id}>{(i18n.language.startsWith('en')?settings.bodyEn:settings.bodyTr)&&<p className="px-4 pt-4 text-white/70">{i18n.language.startsWith('en')?settings.bodyEn:settings.bodyTr}</p>}<FeaturedShowcaseRow title={heading} items={items} maxItems={settings.count} columns={4} viewAllHref={href} viewAllFooterOnly getGuestHref={guestItemHref}/></GuestBlockFrame>}
