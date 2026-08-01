export interface HomePageItem {
  href: string;
  iconName: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export interface HomePageData {
  pages: HomePageItem[];
}
