// app/types/models/tenant.ts

/**
 * Tenant meta information
 */
export type TenantMeta = {
  id: number;
  domain: string;
  name: string;
  shortName?: string | null;
  branding: {
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    version?: string | null;
  };
  locale: {
    default: string;
    supported: string[];
    numberSystem: string;
    calendarMode: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
  };
  currency: { code: string; symbol: string; position: "prefix" | "suffix" };
  features: Record<string, boolean>;
  policy: Record<string, any>;
  status: { active: boolean; maintenance: boolean };
};
