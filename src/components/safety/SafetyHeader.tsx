
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SafetyHeader = () => {
  return (
    <div className="mb-8">
      <h1 className="text-4xl font-bold text-blue-800 mb-4">Caravan Safety Guide</h1>
      <p className="text-xl text-gray-700 max-w-3xl">
        Simple, easy-to-follow guides to help you stay safe on your travels.
      </p>
    </div>
  );
};

export default SafetyHeader;
