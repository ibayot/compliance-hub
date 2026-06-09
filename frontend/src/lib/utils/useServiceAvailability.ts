'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

export interface ServiceAvailability {
  users: boolean;
  ticketing: boolean;
  compliance: boolean;
}

const DEFAULT_AVAILABILITY: ServiceAvailability = {
  users: true,
  ticketing: true,
  compliance: true,
};

export function useServiceAvailability() {
  const [services, setServices] = useState<ServiceAvailability>(DEFAULT_AVAILABILITY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await apiClient.get('/health');
        const apiServices = response?.data?.services;
        if (!mounted || !apiServices) return;
        setServices({
          users: apiServices.users !== false,
          ticketing: apiServices.ticketing !== false,
          compliance: apiServices.compliance !== false,
        });
      } catch {
        if (!mounted) return;
        // Keep default true when gateway health cannot be read.
      } finally {
        if (mounted) setLoaded(true);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { services, loaded };
}
