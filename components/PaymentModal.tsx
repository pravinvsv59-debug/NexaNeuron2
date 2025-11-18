import React, { useState, useEffect } from 'react';
import { XCircleIcon, ClipboardIcon, CheckIcon } from '../constants';
import Spinner from './Spinner';

interface PaymentModalProps {
  plan: {
    title: string;
    price: string;
    amount: number;
  };
  onClose: () => void;
  onPaymentSuccess: () => void;
}

const UPI_ID = '7096286278@ibl';
const PAYEE_NAME = 'NexaNeuron';

const PaymentModal: React.FC<PaymentModalProps> = ({ plan, onClose, onPaymentSuccess }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const link = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${plan.amount}.00&cu=INR&tn=NexaNeuron ${plan.title} Plan`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(link)}`;
    setQrCodeUrl(qrUrl);
  }, [plan]);

  const handleConfirmPayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      onPaymentSuccess(); // This will trigger closing the premium page after a delay in App.tsx
    }, 3000); // Simulate 3 second payment verification
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleClose = () => {
    if (!isProcessing) {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-fade-in-down" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Your Payment</h2>
          <button onClick={handleClose} disabled={isProcessing} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 text-center text-gray-800 dark:text-gray-200 overflow-y-auto">
          {paymentSuccess ? (
             <div className="flex flex-col items-center justify-center py-8">
                <svg className="w-20 h-20 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 className="text-2xl font-bold">Payment Successful!</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-2">Your premium features have been unlocked. Enjoy!</p>
                <p className="text-sm mt-4">This window will close automatically.</p>
             </div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" />
              <p className="mt-4 font-semibold">Verifying Payment...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This may take a few seconds.</p>
            </div>
          ) : (
            <>
              <p className="mb-2">You are purchasing the <span className="font-bold text-indigo-500 dark:text-indigo-400">{plan.title}</span> plan for <span className="font-bold">{plan.price}</span>.</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scan the QR code with any UPI app to pay.</p>
              <div className="my-4 p-4 bg-white rounded-lg inline-block">
                {qrCodeUrl ? <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto" /> : <div className="w-48 h-48 flex items-center justify-center"><Spinner /></div>}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Or pay to UPI ID:</p>
              <div className="flex items-center justify-center gap-2 mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                <p className="font-mono text-lg">{UPI_ID}</p>
                <button onClick={handleCopyToClipboard} className="p-1 text-gray-600 dark:text-gray-300 hover:text-indigo-500 dark:hover:text-indigo-400">
                  {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ClipboardIcon className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-4">This is a simulated payment gateway. No actual payment will be processed. Click the button below after "paying".</p>
              <button
                onClick={handleConfirmPayment}
                className="mt-6 w-full py-3 bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                I Have Completed The Payment
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
