import { gearCatalog, gearCategories } from "@/data/gearCatalog";
import GearList from "@/components/shop/GearList";
import { PageHelp } from "@/components/common/PageHelp";

export default function Shop() {
  return (
    <div className="container p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Recommended Gear</h1>
        <p className="text-muted-foreground">
          Curated essentials we actually use on the road. Links go to Amazon
          Australia - international visitors can use the "Search locally" link
          on each item.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          We may earn a small commission through affiliate links at no extra
          cost to you.
        </p>
      </div>

      <GearList items={gearCatalog} categories={gearCategories} />

      <PageHelp
        title="Gear List Help"
        description="These are products we personally recommend for RV and caravan travel. We keep the list short and useful."
        tips={[
          "Links go to Amazon Australia search results so you always see current options",
          "Use the 'Search locally' link to find equivalent products in your region",
          "No prices shown - check the retailer for current pricing",
          "Supplier links go directly to the manufacturer's site",
        ]}
      />
    </div>
  );
}
