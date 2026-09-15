import type {Metadata} from 'next';
import PixelShowcase from '@/components/studies/inktrace-pixel/PixelShowcase';
export const metadata:Metadata={title:'InkTrace — pixel archive study',description:'An interactive pixel-art archive. Independent sample content, not a product recording.',robots:{index:false,follow:false}};
export default function PixelWindowStudy(){return <PixelShowcase/>;}
