import { ContentTabs } from "@/components/backend/content/ContentTabs";
import { PageHeader } from "@/components/dashboard/erp";

export default function BackendContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Backend"
        title="Content"
        description="Branding, navigation, the homepage hero, the footer, images, and the FAQ and legal pages. Changes go live when you save."
      />
      <ContentTabs />
      <div>{children}</div>
    </div>
  );
}
