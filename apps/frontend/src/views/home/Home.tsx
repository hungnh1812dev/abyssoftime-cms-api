"use client";

import { BookOpen, Code2, FileText, GitBranch, type LucideIcon, Syringe } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import type { HomePageData } from "@/views/home/home.types";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  BookOpen,
  GitBranch,
  Syringe,
  Code2,
};

interface HomeProps {
  data: HomePageData;
}

const Home: React.FC<HomeProps> = ({ data }) => {
  const params = useParams();
  const locale = params?.locale ?? "en";

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-bold">Trang chủ</h1>
      <p className="mb-8 text-sm text-muted-foreground">Chọn công cụ bên dưới để bắt đầu.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.pages.map((page) => {
          const Icon = ICON_MAP[page.iconName] ?? FileText;
          return (
            <Link
              key={page.href}
              href={`/${locale}${page.href}`}
              className="group flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/10">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-md border bg-muted p-2">
                  <Icon size={16} className="text-foreground/70" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{page.title}</p>
                  <p className="text-xs text-muted-foreground">{page.subtitle}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{page.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {page.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default Home;
