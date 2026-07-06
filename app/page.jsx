import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDefaultHomePath } from '@/lib/permissions';

export default async function Home() {
  const session = await auth();
  redirect(getDefaultHomePath(session?.user?.role));
}
