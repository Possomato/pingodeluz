'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/context/AdminContext';

export default function AdminRootPage() {
  const { isAuthenticated } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    router.replace(isAuthenticated ? '/admin/produtos' : '/admin/login');
  }, [isAuthenticated, router]);

  return null;
}
