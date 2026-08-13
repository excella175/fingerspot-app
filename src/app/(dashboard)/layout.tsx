import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 p-6 lg:p-8">
        {children}
      </main>
    </>
  );
}
