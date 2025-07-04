
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
      className="bg-white p-4 sm:p-6 rounded-lg shadow-sm box-border w-full mb-8"
    >
      <div className="flex flex-wrap items-center gap-4 mb-6 w-full box-border">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold break-words">{title}</h2>
      </div>
      <div className="pl-2 sm:pl-4 border-l-4 border-blue-500 w-full box-border">
        {content}
      </div>
      <div className="mt-8 flex justify-end w-full box-border">
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
