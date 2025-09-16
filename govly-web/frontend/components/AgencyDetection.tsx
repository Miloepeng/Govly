import { AgencyDetection as AgencyDetectionType, Message } from '../types/chat';

interface AgencyDetectionProps {
  agencyDetection: AgencyDetectionType;
  selectedCountry: string;
  onAccept: (agency: string) => void;
  onDismiss: () => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export default function AgencyDetection({
  agencyDetection,
  selectedCountry,
  onAccept,
  onDismiss,
  setMessages,
}: AgencyDetectionProps) {
  return (
    <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">💡</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-900">
                Would you like to talk to {agencyDetection.agency}?
              </h3>
              <p className="text-xs text-green-700">
                {agencyDetection.reasoning}
              </p>
              {agencyDetection.category && (
                <p className="text-xs text-green-600 mt-1">
                  📍 {agencyDetection.category.replace("_", " ").toUpperCase()} • {selectedCountry}
                </p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                onAccept(agencyDetection.agency);
                // Add confirmation message to chat
                const confirmationMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `✅ Connected to ${agencyDetection.agency}! I'm now speaking on behalf of this agency and can provide you with specialized assistance.`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, confirmationMessage]);
              }}
              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Yes, connect me
            </button>
            <button
              onClick={onDismiss}
              className="text-green-600 hover:text-green-800 text-sm px-4 py-2 rounded-lg border border-green-200 hover:bg-green-50"
            >
              No, thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
