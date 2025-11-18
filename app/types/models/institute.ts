// app/types/models/institute.ts

/**
 * Institute names (multilingual)
 */
export type InstituteNames = {
  en?: string | null;
  bn?: string | null;
  ar?: string | null;
};

/**
 * Institute contact information
 */
export type InstituteContact = {
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  social?: {
    facebook?: string | null;
    youtube?: string | null;
    whatsapp?: string | null;
  } | null;
};

/**
 * Institute profile
 */
export type InstituteProfile = {
  names: InstituteNames | null;
  contact: InstituteContact;
};
