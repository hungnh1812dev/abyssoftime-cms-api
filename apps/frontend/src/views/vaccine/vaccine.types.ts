export interface Vaccine {
  name: string;
  origin: string;
  year: number;
  tech: string;
  doses: string;
  price: string;
  protection: string;
  pros: string;
  cons: string;
}

export interface VaccineGroup {
  id: string;
  disease: string;
  vaccines: Vaccine[];
}

export interface RecommendedVaccine {
  disease: string;
  vaccine: string;
  reason: string;
  doses: string;
  price: string;
  total: number;
}

export interface VNVCPackage {
  id: number;
  name: string;
  price: string;
  items: string[];
}

export interface VaccinePageData {
  groups: VaccineGroup[];
  recommended: RecommendedVaccine[];
  vnvcPackages: VNVCPackage[];
}
