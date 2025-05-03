
import { useNavigate } from 'react-router-dom';

export interface TabItemProps {
  id: string;
  label: string;
  path: string;
  isActive: boolean;
  onClick: (id: string, path: string) => void;
}

const TabItem = ({ id, label, path, isActive, onClick }: TabItemProps) => {
  return (
    <button
      className={`text-lg font-semibold py-4 border-b-2 transition-colors ${
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
      onClick={() => onClick(id, path)}
    >
      {label}
    </button>
  );
};

export default TabItem;
