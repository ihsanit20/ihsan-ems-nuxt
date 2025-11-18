// app/types/models/address.ts

/**
 * Division
 */
export type Division = {
  id: number;
  name: string;
  en_name: string;
};

/**
 * District
 */
export type District = {
  id: number;
  division_id: number;
  name: string;
  en_name: string;
};

/**
 * Area
 */
export type Area = {
  id: number;
  district_id: number;
  name: string;
  en_name: string;
};

/**
 * Address JSON structure
 */
export type AddressJson = {
  division_id?: number | null;
  district_id?: number | null;
  area_id?: number | null;
  village_house_holding?: string | null;
};

/**
 * Address data for forms
 */
export type AddressData = {
  division_id: number | undefined;
  district_id: number | undefined;
  area_id?: number | undefined;
  village_house_holding: string;
};
