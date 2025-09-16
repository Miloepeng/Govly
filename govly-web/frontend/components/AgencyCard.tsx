import { Message } from '../types/chat';

interface AgencyCardProps {
  selectedAgency: string;
  selectedCountry: string;
  onDisconnect: () => void;
  onSwitchAgency: () => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export default function AgencyCard({
  selectedAgency,
  selectedCountry,
  onDisconnect,
  onSwitchAgency,
  setMessages,
}: AgencyCardProps) {
  return (
    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {selectedAgency.split(' ').map(word => word[0]).join('')}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-blue-900">
                🏛️ Speaking on behalf of {selectedAgency}
              </h3>
              <p className="text-xs text-blue-700">
                All responses are now from this agency's perspective
              </p>
              <p className="text-xs text-blue-600 mt-1">
                🌍 {selectedCountry}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onDisconnect}
              className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              Disconnect
            </button>
            <button
              onClick={() => {
                onSwitchAgency();
                // Add disconnection message to chat
                const disconnectionMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `🔌 Disconnected from ${selectedAgency}. I'm now providing general government assistance.`,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, disconnectionMessage]);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
            >
              Switch Agency
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
