export interface Banner {
 id:string; name:string; titleTr:string; titleEn:string; bodyTr:string; bodyEn:string; imageUrl:string; link:string;
 audience:'all'|'guest'|'member'; placement:'top'|'bottom'; size:'small'|'medium'|'large';
 startsAt:string; endsAt:string; active:boolean; views:number; clicks:number;
}
