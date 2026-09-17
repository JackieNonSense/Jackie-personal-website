import type { Metadata } from 'next';
import InkReadingRoom from '@/components/studies/inktrace-reading/InkReadingRoom';

export const metadata: Metadata = {
  title: 'InkTrace — reading room study',
  description: 'A local interactive editorial study. Not the InkTrace product interface.',
  robots: { index: false, follow: false },
};

export default function ReadingRoomStudyPage() {
  return <InkReadingRoom />;
}
