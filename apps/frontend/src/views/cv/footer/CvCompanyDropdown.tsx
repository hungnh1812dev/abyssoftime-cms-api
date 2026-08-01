"use client";

import { useParams, useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CvListItemType } from "@/views/cv/CvPage";

interface CvCompanyDropdownProps {
  items: CvListItemType[];
}

export const CvCompanyDropdown = ({ items }: CvCompanyDropdownProps) => {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale ?? "en";

  return (
    <Select onValueChange={(documentId) => router.push(`/${locale}/cv/${documentId}`)}>
      <SelectTrigger className="h-8 w-44 text-xs">
        <SelectValue placeholder="Company CVs" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.documentId} value={item.documentId} className="text-xs">
            {item.companyName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
