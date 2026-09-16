import type {Metadata} from 'next';
import ReviewGallery from '@/components/studies/inktrace-living-review/ReviewGallery';

export const metadata:Metadata={
 title:'InkTrace — Living Archive / Art Direction Review',
 description:'Phase-one concept boards, live pixel typography and an independent sprite-motion proof. Not an interactive product demo.',
 robots:{index:false,follow:false},
};

export default function LivingArchiveReviewPage(){return <ReviewGallery/>;}
