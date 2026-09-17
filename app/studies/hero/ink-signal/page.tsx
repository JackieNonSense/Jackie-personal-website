import type {Metadata} from 'next';
import HeroInkSignal from '@/components/studies/hero-ink-signal/HeroInkSignal';

export const metadata:Metadata={title:'Hero — Ink Signal Study',robots:{index:false,follow:false}};
export default async function InkSignalPage({searchParams}:{searchParams:Promise<{clean?:string}>}){
 const params=await searchParams;
 return <HeroInkSignal clean={params.clean==='1'}/>;
}
