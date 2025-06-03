//app/MyWebsite/property/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import PropertiesTab from 'src/components/MyWebsite/propertyTab';

export default function PropertiesPage() {
  const router = useRouter();

  return (
    <PropertiesTab
      onDeleteProperty={(id) => router.push(`/MyWebsite/property/delete/${id}`)}
      onViewProperty={(id) => router.push(`/MyWebsite/property/view/${id}`)}
      onEditProperty={(id) => router.push(`/MyWebsite/property/edit/${id}`)}
      onAddProperty={() => router.push('/MyWebsite/property/add')}
    />
  );
}