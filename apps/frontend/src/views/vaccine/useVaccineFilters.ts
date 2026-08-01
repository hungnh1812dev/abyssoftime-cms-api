"use client";

import { useMemo, useState } from "react";

import type { RecommendedVaccine, VaccineGroup, VaccinePageData, VNVCPackage } from "@/views/vaccine/vaccine.types";

type ActiveTab = "all" | "recommended" | "vnvc";

export interface VNVCPackageStat extends VNVCPackage {
  matched: string[];
  alternatives: string[];
  missing: string[];
  matchPercentage: number;
}

export interface VNVCStats {
  stats: VNVCPackageStat[];
  maxMatch: number;
}

export function filterVaccineGroups(groups: VaccineGroup[], searchTerm: string): VaccineGroup[] {
  if (!searchTerm) return groups;
  const lower = searchTerm.toLowerCase();
  return groups
    .map((group) => {
      if (group.disease.toLowerCase().includes(lower)) return group;
      const matchingVaccines = group.vaccines.filter((v) => v.name.toLowerCase().includes(lower) || v.origin.toLowerCase().includes(lower));
      if (matchingVaccines.length > 0) return { ...group, vaccines: matchingVaccines };
      return null;
    })
    .filter(Boolean) as VaccineGroup[];
}

export function computeVNVCStats(vnvcPackages: VNVCPackage[], recommended: RecommendedVaccine[]): VNVCStats {
  const recommendedNames = recommended.map((r) => r.vaccine);
  const stats = vnvcPackages.map((pkg) => {
    const matched = pkg.items.filter((item) => recommendedNames.includes(item));
    const alternatives = pkg.items.filter((item) => !recommendedNames.includes(item));
    const missing = recommendedNames.filter((item) => !pkg.items.includes(item));
    const matchPercentage = Math.round((matched.length / recommendedNames.length) * 100);
    return { ...pkg, matched, alternatives, missing, matchPercentage };
  });
  const maxMatch = Math.max(...stats.map((s) => s.matchPercentage));
  return { stats, maxMatch };
}

export interface VaccineFiltersResult {
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  expandedGroups: string[];
  toggleGroup: (id: string) => void;
  filteredData: VaccineGroup[];
  vnvcPackageStats: VNVCStats;
}

export function useVaccineFilters(data: VaccinePageData): VaccineFiltersResult {
  const { groups, recommended, vnvcPackages } = data;
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>(groups.map((g) => g.id));

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]));
  };

  const filteredData = useMemo(() => filterVaccineGroups(groups, searchTerm), [groups, searchTerm]);
  const vnvcPackageStats = useMemo(() => computeVNVCStats(vnvcPackages, recommended), [vnvcPackages, recommended]);

  return { activeTab, setActiveTab, searchTerm, setSearchTerm, expandedGroups, toggleGroup, filteredData, vnvcPackageStats };
}
