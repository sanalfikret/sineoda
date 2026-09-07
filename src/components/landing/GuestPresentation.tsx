import {createContext,useContext,useEffect,useState,type ReactNode} from 'react'
import {api} from '../../api/client'
import {FeaturedShowcaseRow} from '../FeaturedShowcaseRow'
import {guestItemHref} from '../../utils/landingContentLinks'
import type {ContentItem} from '../../types/content'
export type Presentation={count:3|6|9;width:'normal'|'wide';align:'left'|'center'}
export const defaultPresentation:Presentation={count:6,width:'normal',align:'left'}
const Context=createContext<Record<string,Presentation>>({})
export function GuestPresentationProvider({children}:{children:ReactNode}){const [settings,setSettings]=useState<Record<string,Presentation>>({});useEffect(()=>{void api<Record<string,Presentation>>('/api/landing-presentation').then(setSettings).catch(()=>{})},[]);return <Context.Provider value={settings}>{children}</Context.Provider>}
export function GuestBlockFrame({id,children}:{id:string;children:ReactNode}){const settings=useContext(Context)[id]??defaultPresentation;return <div className={(settings.width==='wide'?'max-w-7xl':'max-w-5xl')+' mx-auto w-full min-w-0 px-4 [&_section]:max-w-none '+(settings.align==='center'?'text-center [&_.text-left]:text-center':'text-left [&_.text-center]:text-left')}>{children}</div>}
export function GuestGrid({id,title,items,href}:{id:string;title:string;items:ContentItem[];href?:string}){const settings=useContext(Context)[id]??defaultPresentation;return <GuestBlockFrame id={id}><FeaturedShowcaseRow title={title} items={items} maxItems={settings.count} viewAllHref={href} viewAllFooterOnly getGuestHref={guestItemHref}/></GuestBlockFrame>}
