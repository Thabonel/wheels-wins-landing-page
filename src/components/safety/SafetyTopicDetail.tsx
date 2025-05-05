
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
      className="bg-white p-4 sm:p-6 rounded-lg shadow-md overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold break-words">{title}</h2>
      </div>
      <div className="pl-2 sm:pl-4 border-l-4 border-blue-500 overflow-hidden">
        {content}
      </div>
      <div className="mt-8 flex justify-end">
        <Button 
          variant="outline" 
          onClick={scrollToTop}
          className="flex items-center gap-2"
        >
          Back to Top
        </Button>
      </div>
    </section>
  );
};

export default SafetyTopicDetail;
