import type {Metadata} from 'next';
import LivingArchive from '@/components/studies/inktrace-living/LivingArchive';

export const metadata:Metadata={title:'InkTrace — The Living Archive',description:'Four silent, playable pixel-art scenes. Independent sample content, not a product recording.',robots:{index:false,follow:false}};
export default function LivingArchivePage(){return <LivingArchive/>;}
