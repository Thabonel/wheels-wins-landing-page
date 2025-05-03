
import TabItem, { TabItemProps } from './TabItem';

export interface TabData {
  id: string;
  label: string;
  path: string;
}

interface TabListProps {
  tabs: TabData[];
  activeTab: string;
  onTabChange: (tabId: string, path: string) => void;
}

const TabList = ({ tabs, activeTab, onTabChange }: TabListProps) => {
  return (
    <div className="flex space-x-8">
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          id={tab.id}
          label={tab.label}
          path={tab.path}
          isActive={activeTab === tab.id}
          onClick={onTabChange}
        />
      ))}
    </div>
  );
};

export default TabList;
