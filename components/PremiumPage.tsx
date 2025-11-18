import React, { useState } from 'react';
import { ArrowLeftIcon, CrownIcon, CheckCircleIcon } from '../constants';
import { UserProfile } from '../App';
import PaymentModal from './PaymentModal';

interface PremiumPlanCardProps {
    title: string;
    price: string;
    period: string;
    features: string[];
    popular?: boolean;
    save?: string;
    buttonText: string;
    buttonClass?: string;
    isDisabled: boolean;
    onButtonClick: () => void;
}

const PremiumPlanCard: React.FC<PremiumPlanCardProps> = ({ title, price, period, features, popular, save, buttonText, buttonClass, isDisabled, onButtonClick }) => (
    <div className={`relative bg-white/10 backdrop-blur-lg rounded-xl p-6 border ${popular ? 'border-2 border-yellow-400' : 'border-white/20'} transform hover:scale-105 transition-transform duration-300`}>
        {popular && (
            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 px-3 py-1 text-sm font-bold rounded-full">
                Most Popular
            </div>
        )}
        <h3 className="text-xl font-semibold text-yellow-400">{title}</h3>
        <p className="text-4xl font-bold mt-4">{price}<span className="text-lg font-normal text-gray-400">{period}</span></p>
        {save && <p className="text-green-400 font-semibold mt-1">{save}</p>}
        <ul className="mt-6 text-left space-y-3 text-gray-300">
            {features.map(feature => (
                <li key={feature} className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
        <button 
            onClick={onButtonClick}
            disabled={isDisabled}
            className={`mt-8 w-full py-3 rounded-full font-semibold transition-transform duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 ${buttonClass || 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}
        >
            {buttonText}
        </button>
    </div>
);

interface Plan {
    title: string;
    price: string;
    amount: number;
    period: string;
    features: string[];
    popular?: boolean;
    save?: string;
    buttonText: string;
    buttonClass?: string;
}

interface PremiumPageProps {
  user: UserProfile;
  onClose: () => void;
  onPremiumUnlocked: () => void;
}

const PremiumPage = ({ user, onClose, onPremiumUnlocked }: PremiumPageProps) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const plans: Plan[] = [
    {
      title: 'Monthly',
      price: '₹499',
      amount: 499,
      period: ' / month',
      features: ['Unlimited Coins', 'Priority Access to Features', 'Ad-Free Experience', 'Enhanced AI Models'],
      buttonText: 'Choose Monthly'
    },
    {
      title: 'Yearly',
      price: '₹4,999',
      amount: 4999,
      period: ' / year',
      features: ['Unlimited Coins', 'Priority Access to Features', 'Ad-Free Experience', 'Enhanced AI Models'],
      popular: true,
      save: 'Save over 15%',
      buttonText: 'Choose Yearly',
      buttonClass: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900'
    },
    {
      title: 'Lifetime',
      price: '₹14,999',
      amount: 14999,
      period: ' one time',
      features: ['Unlimited Coins', 'Priority Access to Features', 'Ad-Free Experience', 'Enhanced AI Models'],
      buttonText: 'Go Lifetime'
    }
  ];

  const handleChoosePlan = (plan: Plan) => {
    if (user?.isPremium) return;
    setSelectedPlan(plan);
  };

  return (
    <>
      <div className="relative min-h-screen font-sans text-white">
        <div className="premium-background"></div>
        <div className="relative z-10 p-4 sm:p-6 lg:p-8">
          <header className="flex items-center">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Go back">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold ml-4">NexaNeuron Premium</h1>
          </header>

          <main className="mt-8 max-w-5xl mx-auto text-center animate-fade-in-down">
            <CrownIcon className="w-24 h-24 mx-auto text-yellow-400" />
            <h2 className="text-4xl font-extrabold mt-4">Unlock Your Full Potential</h2>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
              Go Premium to receive unlimited coins, priority access to new features, and an ad-free experience. Fuel your creativity and never run out of NexaNeuron coins again.
            </p>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {plans.map(plan => 
                <PremiumPlanCard 
                  key={plan.title} 
                  {...plan} 
                  isDisabled={!!user.isPremium}
                  buttonText={user.isPremium ? 'Subscribed' : plan.buttonText}
                  onButtonClick={() => handleChoosePlan(plan)}
                />)
              }
            </div>
          </main>
        </div>
      </div>
      {selectedPlan && (
        <PaymentModal 
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onPaymentSuccess={onPremiumUnlocked}
        />
      )}
    </>
  );
};

export default PremiumPage;
