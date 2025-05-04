
import { useIsMobile } from "@/hooks/use-mobile";
import PamAssistant from "@/components/PamAssistant";

interface PamAssistantWrapperProps {
  user: {
    name: string;
    avatar: string;
  };
}

export default function PamAssistantWrapper({ user }: PamAssistantWrapperProps) {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <>
        <button 
          onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
          className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
        >
          <span className="text-lg font-bold">Pam</span>
        </button>
        
        {/* Mobile Pam modal */}
        <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Chat with Pam</h3>
              <button 
                onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                className="text-gray-500"
              >
                Close
              </button>
            </div>
            <PamAssistant user={user} />
          </div>
        </div>
      </>
    );
  }
  
  return <PamAssistant user={user} />;
}
