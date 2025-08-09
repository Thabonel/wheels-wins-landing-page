
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabValue } from "./types";

interface ProductFiltersProps {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
  isMobile: boolean;
}

export default function ProductFilters({ activeTab, setActiveTab, isMobile }: ProductFiltersProps) {
  if (isMobile) {
    return (
      <div className="w-full p-2">
        <select 
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabValue)}
          className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm"
        >
          <option value="all">All Products</option>
          <option value="digital">Digital Products</option>
          <option value="affiliate">Affiliate Products</option>
        </select>
      </div>
    );
  }
  
  return (
    <>
      <TabsTrigger value="all" className="text-base py-3 px-6">
        All Products
      </TabsTrigger>
      <TabsTrigger value="digital" className="text-base py-3 px-6">
        Digital Products
      </TabsTrigger>
      <TabsTrigger value="affiliate" className="text-base py-3 px-6">
        Affiliate Products
      </TabsTrigger>
    </>
  );
}
