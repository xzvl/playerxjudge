import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardFeatureGrid({
  title,
  description,
  features,
}: {
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div>
      <h1 className="heading text-2xl">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-on-surface/60">{description}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature}>
            <CardHeader>
              <CardTitle className="text-base">{feature}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-on-surface/50">Coming in the next build phase.</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
