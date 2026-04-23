'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const normalizeSiteUrl = (rawUrl: string, fallbackPort?: number) => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.port) return rawUrl;
    if (fallbackPort) {
      return `${parsed.protocol}//${parsed.hostname}:${fallbackPort}`;
    }
    return rawUrl;
  } catch {
    if (fallbackPort && /^https?:\/\//i.test(rawUrl) && !/:[0-9]+(?:\/|$)/.test(rawUrl)) {
      return `${rawUrl.replace(/\/$/, '')}:${fallbackPort}`;
    }
    return rawUrl;
  }
};

export default function OpenGeneratedSitePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Opening your generated site...');

  const pathSuffix = useMemo(() => {
    const target = searchParams.get('target');
    return target === 'manage' ? '/MyWebsite/property' : '';
  }, [searchParams]);

  useEffect(() => {
    const openSite = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          setStatus('Session expired. Redirecting to login...');
          window.location.replace('/login');
          return;
        }

        setStatus('Starting your generated site...');
        const token = await user.getIdToken();

        const startResponse = await axios.post(
          `${API_BASE_URL}/site-generator/${user.uid}/start`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 60000,
          }
        );

        let siteUrl = startResponse?.data?.url
          ? normalizeSiteUrl(startResponse.data.url, startResponse.data.port)
          : '';

        if (!siteUrl) {
          const statusResponse = await axios.get(`${API_BASE_URL}/site-generator/status`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            timeout: 15000,
          });

          const allSites = [...(statusResponse.data.running || []), ...(statusResponse.data.all || [])];
          const siteInfo = allSites.find((site: any) => site.hostId === user.uid);
          if (siteInfo?.url) {
            siteUrl = normalizeSiteUrl(siteInfo.url, siteInfo.port);
          }
        }

        if (!siteUrl) {
          throw new Error('Failed to get a valid site URL');
        }

        let finalUrl = siteUrl;
        if (pathSuffix) {
          const normalizedSuffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
          try {
            finalUrl = new URL(normalizedSuffix, siteUrl).toString();
          } catch {
            finalUrl = `${siteUrl.replace(/\/$/, '')}${normalizedSuffix}`;
          }
        }

        setStatus('Redirecting...');
        window.location.replace(finalUrl);
      } catch (error) {
        console.error('Error opening generated site:', error);
        setStatus('Unable to open generated site. Please return to dashboard and retry.');
      }
    };

    openSite();
  }, [pathSuffix]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 16 }}>
      {status}
    </div>
  );
}
