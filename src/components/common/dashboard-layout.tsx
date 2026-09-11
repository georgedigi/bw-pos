import { Navbar } from "./navbar";

interface ContentLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function DashboardLayout({ title, children }: ContentLayoutProps) {
  return (
    <div className="min-h-[100vh] ">
      <Navbar title={title} />
      <div className=" px-4 pb-8 pt-8 sm:px-8">{children}</div>
    </div>
  );
}
