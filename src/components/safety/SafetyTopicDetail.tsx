
import { Button } from "@/components/ui/button";

interface SafetyTopicDetailProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const SafetyTopicDetail = ({ id, title, icon, content }: SafetyTopicDetailProps) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section 
      id={id} 
      className="bg-white p-6 rounded-lg shadow-md"
    >
      <div className="flex items-center gap-4 mb-6">
        {icon}
        <h2 className="text-3xl font-bold">{title}</h2>
      </div>
      <div className="pl-4 border-l-4 border-blue-500">
        {content}
      </div>
      <div className="mt-8 flex justify-end">
        <Button 
          variant="outline" 
          onClick={scrollToTop}
          className="flex items-center gap-2 text-lg"
        >
          Back to Top
        </Button>
      </div>
    </section>
  );
};

export default SafetyTopicDetail;
