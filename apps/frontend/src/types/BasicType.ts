// Shape sau khi await params — dùng cho layout/view components (không phải route files)
// locale là optional vì root layout (route "/") không có dynamic segment
export type ResolvedParams = {
  locale?: string;
  [K: string]: string | undefined;
};

// Route-level types: Next.js 15 truyền params/searchParams dưới dạng Promise
export type BaseLayoutProps = Readonly<{
  children?: React.ReactNode;
  params: Promise<ResolvedParams>;
}>;

export type BasePageProps = Readonly<{
  params: Promise<ResolvedParams>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}>;
