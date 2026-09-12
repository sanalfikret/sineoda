import {useTranslation} from 'react-i18next'
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {api} from '../../api/client'
import {ContentCard} from '../ContentCard'
import {Link} from 'react-router-dom'
import {useLocale} from '../../i18n/LocaleContext'
import {guestItemHref} from '../../utils/landingContentLinks'
import type {ContentItem} from '../../types/content'
export type Presentation={count:number;titleTr?:string;titleEn?:string;bodyTr?:string;bodyEn?:string;removed?:boolean;size?:'compact'|'normal'|'large';width:'normal'|'wide';align:'left'|'center';cardSize?:'normal'|'large';columns?:3|4;mobile?:'single'|'double'}
export const defaultPresentation:Presentation={count:8,width:'wide',align:'left',columns:4,mobile:'single'}
export const Context=createContext<Record<string,Presentation>>({})
export function GuestPresentationProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState<Record<string,Presentation>>({});useEffect(()=>{void api<Record<string,Presentation>>('/api/landing-presentation').then(setSettings).catch(()=>{})},[]);return <Context.Provider value={settings}>{children}</Context.Provider>}
export function GuestBlockFrame({id,children}:{id:string;children:ReactNode}){const settings=useContext(Context)[id]??defaultPresentation;if(settings.removed)return null;return <div className={(settings.width==='wide'?'max-w-7xl':'max-w-5xl')+' mx-auto w-full min-w-0 px-4 [&_section]:max-w-none [&_.max-w-5xl]:max-w-none '+(settings.size==='compact'?'[&_section]:py-2 [&_section]:px-0':settings.size==='large'?'[&_section]:py-12 [&_section]:px-0':'[&_section]:px-0')+' '+(settings.align==='center'?'text-center [&_.text-left]:text-center':'text-left [&_.text-center]:text-left')}>{children}</div>}
/** Ziyaretçi içerik bloğu: kaydırma yok; admin'in seçtiği adet kadar kart alt alta ızgarada, büyük ve üzerine gelince detaylı. */
export function GuestGrid({id,title,items,href}:{id:string;title:string;items:ContentItem[];href?:string}){
 const settings=useContext(Context)[id]??defaultPresentation
 const {i18n,t}=useTranslation('browse')
 const {localizePath}=useLocale()
 const en=i18n.language.startsWith('en')
 const heading=(en?settings.titleEn:settings.titleTr)||title
 const body=en?settings.bodyEn:settings.bodyTr
 const visible=items.slice(0,settings.count)
 if(visible.length===0)return null
 const columns=settings.columns===3?3:4
 const mobileCols=settings.mobile==='double'?'grid-cols-2':'grid-cols-1'
 const desktopCols=columns===3?'lg:grid-cols-3':'lg:grid-cols-4'
 return <GuestBlockFrame id={id}>
  <section className="py-8 sm:py-10">
   <div className="mb-4 flex items-center justify-between gap-3">
    <h2 className="text-[calc(1.25rem+2pt)] font-semibold text-white sm:text-[calc(1.5rem+2pt)]">{heading}</h2>
    {href&&<Link to={localizePath(href)} className="hidden text-sm font-medium text-plooy-gold hover:underline sm:inline">{t('viewAll')}</Link>}
   </div>
   {body&&<p className="mb-4 max-w-3xl text-white/70">{body}</p>}
   <div className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6 ${mobileCols} ${desktopCols}`}>
    {visible.map(item=><ContentCard key={item.id} item={item} onSelect={()=>undefined} layout="landscape" forceLandscape variant="grid" hoverPreview guestHref={guestItemHref(item)}/>)}
   </div>
   {href&&<div className="mt-6 text-center"><Link to={localizePath(href)} className="inline-flex items-center justify-center rounded-lg border border-plooy-gold/40 bg-plooy-gold/10 px-5 py-2.5 text-sm font-semibold text-plooy-gold transition hover:bg-plooy-gold/20">{t('viewAll')}</Link></div>}
  </section>
 </GuestBlockFrame>
}
