import React from 'react';
import { Shield, Lock, Scale, AlertTriangle } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Scale className="h-8 w-8 text-orange-500" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Terms of Service</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">Last updated: March 25, 2026</p>
      </div>

      <div className="grid gap-8">
        {[
          {
            title: "1. Acceptance of Terms",
            content: "By accessing or using Tradiora, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our platform."
          },
          {
            title: "2. User Accounts",
            content: "You are responsible for maintaining the security of your account and password. Tradiora cannot and will not be liable for any loss or damage from your failure to comply with this security obligation."
          },
          {
            title: "3. Escrow System",
            content: "All transactions on Tradiora must use our internal escrow system. Direct payments between buyers and sellers are strictly prohibited and will result in permanent account suspension."
          },
          {
            title: "4. Prohibited Items",
            content: "Users may not list or sell any items that are illegal, stolen, or violate third-party intellectual property rights. We reserve the right to remove any listing at our sole discretion."
          },
          {
            title: "5. Fees and Payments",
            content: "Tradiora charges a platform fee on every successful transaction. These fees are non-refundable. All payments are processed in USDT (Tether)."
          },
          {
            title: "6. Dispute Resolution",
            content: "In the event of a dispute, Tradiora administrators will act as mediators. Their decision is final and binding for both parties."
          }
        ].map((section, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
            <p className="text-zinc-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-orange-600/10 border border-orange-600/20 p-8 rounded-3xl flex items-start space-x-4">
        <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="text-white font-bold mb-2">Important Notice</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Tradiora is a marketplace platform. We do not own the accounts or services listed by sellers. 
            While we provide escrow protection, users are encouraged to perform their own due diligence before making a purchase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
