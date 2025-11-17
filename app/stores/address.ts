// app/stores/address.ts
import { defineStore } from "pinia";

/* ---------- Types ---------- */

export type Division = {
  id: number;
  name: string;
  en_name: string;
};

export type District = {
  id: number;
  division_id: number;
  name: string;
  en_name: string;
};

export type Area = {
  id: number;
  district_id: number;
  name: string;
  en_name: string;
};

export type AddressData = {
  division_id: number | undefined;
  district_id: number | undefined;
  area_id?: number | undefined;
  village_house_holding: string;
};

/* ---------- Store ---------- */

export const useAddressStore = defineStore("address", {
  state: () => ({
    divisions: [] as Division[],
    districts: [] as District[],
    areas: [] as Area[],

    loadingDivisions: false,
    loadingDistricts: false,
    loadingAreas: false,
  }),

  getters: {
    divisionItems: (state) =>
      state.divisions.map((d) => ({ label: d.name, value: d.id })),

    districtItems: (state) =>
      state.districts.map((d) => ({ label: d.name, value: d.id })),

    areaItems: (state) =>
      state.areas.map((a) => ({ label: a.name, value: a.id })),

    getDistrictsByDivision: (state) => (divisionId: number | null) => {
      if (!divisionId) return [];
      return state.districts.filter((d) => d.division_id === divisionId);
    },

    getAreasByDistrict: (state) => (districtId: number | null) => {
      if (!districtId) return [];
      return state.areas.filter((a) => a.district_id === districtId);
    },
  },

  actions: {
    async fetchDivisions() {
      if (this.divisions.length > 0) return; // Cache divisions

      this.loadingDivisions = true;
      try {
        const { $api } = useNuxtApp();
        this.divisions = await $api<Division[]>("/v1/divisions");
      } catch (error) {
        console.error("Failed to fetch divisions:", error);
        this.divisions = [];
      } finally {
        this.loadingDivisions = false;
      }
    },

    async fetchDistricts(divisionId: number | null, force = false) {
      if (!divisionId) {
        this.districts = [];
        return;
      }

      // Check if we already have districts for this division
      if (!force && this.districts.some((d) => d.division_id === divisionId)) {
        return;
      }

      this.loadingDistricts = true;
      try {
        const { $api } = useNuxtApp();
        this.districts = await $api<District[]>(
          `/v1/districts?division_id=${divisionId}`
        );
      } catch (error) {
        console.error("Failed to fetch districts:", error);
        this.districts = [];
      } finally {
        this.loadingDistricts = false;
      }
    },

    async fetchAreas(districtId: number | null, force = false) {
      if (!districtId) {
        this.areas = [];
        return;
      }

      // Check if we already have areas for this district
      if (!force && this.areas.some((a) => a.district_id === districtId)) {
        return;
      }

      this.loadingAreas = true;
      try {
        const { $api } = useNuxtApp();
        this.areas = await $api<Area[]>(`/v1/areas?district_id=${districtId}`);
      } catch (error) {
        console.error("Failed to fetch areas:", error);
        this.areas = [];
      } finally {
        this.loadingAreas = false;
      }
    },

    clearDistricts() {
      this.districts = [];
    },

    clearAreas() {
      this.areas = [];
    },
  },
});
