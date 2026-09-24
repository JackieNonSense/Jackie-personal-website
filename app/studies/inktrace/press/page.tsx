import type {Metadata} from 'next';
import PressFrames from '@/components/studies/inktrace-press/PressFrames';

export const metadata:Metadata={title:'InkTrace — press run style frames',description:'Two still key frames for the InkTrace press run.',robots:{index:false,follow:false}};
export default function InkTracePressPage(){return <PressFrames/>;}
