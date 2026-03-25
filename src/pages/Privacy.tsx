import React from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="text-center space-y-4">
        <div className="h-16 w-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Privacy Policy</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">Last updated: March 25, 2026</p>
      </div>

      <div className="grid gap-8">
        {[
          {
            icon: Eye,
            title: "1. Information We Collect",
            content: "We collect information you provide directly to us, such as when you create an account, make a purchase, or communicate with us. This includes your name, email address, and wallet address."
          },
          {
            icon: Lock,
            title: "2. How We Use Your Information",
            content: "We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services."
          },
          {
            icon: Shield,
            title: "3. Information Sharing",
            content: "We do not share your personal information with third parties except as required by law or to protect our rights. We do not sell your personal data."
          },
          {
            icon: FileText,
            title: "4. Data Security",
            content: "We use industry-standard security measures to protect your personal information from unauthorized access, use, or disclosure. All data is encrypted and stored securely."
          }
        ].map((section, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center">
                <section.icon className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
            </div>
            <p className="text-zinc-400 leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-blue-600/10 border border-blue-600/20 p-8 rounded-3xl">
        <h3 className="text-white font-bold mb-4">Contact Us</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">
          If you have any questions about our Privacy Policy, please contact us through the Help Center or by email at privacy@tradiora.com.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
