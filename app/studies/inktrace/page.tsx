import type { Metadata } from 'next';
import InkArchive from '@/components/studies/inktrace/InkArchive';

export const metadata: Metadata = {
  title: 'InkTrace — paper interaction study',
  description: 'An independent local study of the InkTrace portfolio section.',
  robots: { index: false, follow: false },
};

export default function InktraceStudyPage() {
  return <InkArchive />;
}
