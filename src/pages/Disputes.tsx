import React from 'react';
import { AlertCircle, Shield, Scale, MessageSquare } from 'lucide-react';

const Disputes: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-red-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Dispute Policy</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">Last updated: March 25, 2026</p>
      </div>

      <div className="grid gap-8">
        {[
          {
            icon: MessageSquare,
            title: "1. Communication First",
            content: "Before opening a dispute, buyers and sellers must attempt to resolve the issue through our internal messaging system. Most problems can be solved with clear communication."
          },
          {
            icon: Shield,
            title: "2. Opening a Dispute",
            content: "If a resolution cannot be reached, either party can open a dispute through the order details page. This will freeze the escrow funds until an administrator reviews the case."
          },
          {
            icon: Scale,
            title: "3. Evidence Submission",
            content: "Both parties will be asked to provide evidence, such as screenshots of account credentials, login attempts, or communication logs. This evidence must be submitted within 24 hours."
          },
          {
            icon: AlertCircle,
            title: "4. Administrator Decision",
            content: "Our administrators will review the evidence and make a final decision. This may result in a full refund, a partial refund, or the release of funds to the seller."
          }
        ].map((section, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <section.icon className="h-5 w-5 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
            </div>
            <p className="text-zinc-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-red-600/10 border border-red-600/20 p-8 rounded-3xl">
        <h3 className="text-white font-bold mb-4">Finality of Decisions</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          The decision made by our administrators is final and binding. By using our platform, you agree to abide by these decisions and waive any right to further legal action regarding the dispute.
        </p>
      </div>
    </div>
  );
};

export default Disputes;
