import { Navbar } from "./navbar";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function ContentLayout({ title, children }: ContentLayoutProps) {
  return (
    <div className="min-h-[100vh]">
      <Navbar title={title} />
      <div className="no-scrollbar px-4 sm:px-8">{children}</div>
    </div>
  );
}
