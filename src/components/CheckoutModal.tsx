import React, { useState } from 'react';
import { X, Lock, CheckCircle, Loader2, Sparkles, Star, Zap, Download, Mic2, Crown } from 'lucide-react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { invoke } from '@tauri-apps/api/core';
import './CheckoutModal.css';

interface CheckoutModalProps {
  planName: string;
  price: number;
  priceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ planName, price, priceId, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [name, setName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;

    if (!name) {
      setError('Please enter the name on your card');
      return;
    }

    setIsProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      setError('Card element not found');
      return;
    }

    try {
      // 1. Fetch client_secret from our Tauri backend
      const clientSecret = await invoke<string>('create_subscription', { priceId });

      // 2. Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name },
        }
      });

      if (stripeError) {
        setError(stripeError.message || 'An error occurred with your payment method.');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('[Checkout] Payment succeeded:', paymentIntent);
        setIsProcessing(false);
        setIsSuccess(true);
        setTimeout(() => { onSuccess(); }, 3500);
      } else {
        setError('Payment failed or requires additional action.');
        setIsProcessing(false);
      }
    } catch (err) {
      setError('Failed to connect to Stripe backend.');
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': { color: '#aab7c4' },
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      },
      invalid: { color: '#df1b41' },
    },
    hidePostalCode: true,
  };

  return (
    <div className="checkout-modal-overlay">
      <div className={`checkout-modal animate-scale-in ${isSuccess ? 'checkout-modal--success' : ''}`}>
        <button className="close-btn" onClick={onClose} disabled={isProcessing || isSuccess}>
          <X size={20} />
        </button>

        {isSuccess ? (
          <div className="checkout-success">
            {/* Confetti particles */}
            <div className="confetti-container">
              {[...Array(20)].map((_, i) => (
                <div key={i} className={`confetti-particle confetti-particle--${i % 5}`} style={{ '--i': i } as React.CSSProperties} />
              ))}
            </div>

            {/* Success icon */}
            <div className="success-icon-wrapper animate-pop">
              <div className="success-icon-ring" />
              <CheckCircle size={52} className="success-icon" strokeWidth={1.5} />
            </div>

            <div className="success-text-block">
              <h2 className="success-title">Payment Successful! 🎉</h2>
              <p className="success-subtitle">
                You're now subscribed to <strong>{planName}</strong>. Get ready to sing!
              </p>
            </div>

            {/* Plan summary card */}
            <div className="success-plan-card">
              <div className="success-plan-header">
                <Sparkles size={18} className="success-plan-icon" />
                <span className="success-plan-name">{planName}</span>
                <span className="success-plan-badge">Active</span>
              </div>
              <div className="success-perks">
                <div className="success-perk"><Mic2 size={14} /><span>Unlimited Karaoke Songs</span></div>
                <div className="success-perk"><Download size={14} /><span>Offline Downloads</span></div>
                <div className="success-perk"><Star size={14} /><span>Premium Audio Quality</span></div>
                <div className="success-perk"><Crown size={14} /><span>Host Party Rooms</span></div>
              </div>
            </div>

            {/* Amount receipt */}
            <div className="success-receipt">
              <span className="success-receipt-label">Amount charged</span>
              <span className="success-receipt-amount">${price.toFixed(2)}<span className="success-receipt-period">/mo</span></span>
            </div>

            <button className="btn-success-cta" onClick={onSuccess}>
              <Zap size={16} />
              Start Singing Now
            </button>

            <p className="success-footer-note">A confirmation receipt has been sent to your email</p>
          </div>
        ) : (
          <>
            <div className="checkout-header">
              <div className="checkout-brand">
                <Lock size={16} className="lock-icon" />
                <span>Secure Checkout</span>
              </div>
              <h2 className="checkout-title">Subscribe to {planName}</h2>
              <div className="checkout-amount">${price.toFixed(2)}<span className="checkout-period">/month</span></div>
            </div>

            <form className="checkout-form" onSubmit={handlePay}>
              {error && <div className="checkout-error">{error}</div>}
              
              <div className="form-group">
                <label>Card Information</label>
                <div className="stripe-card-container">
                  <CardElement options={cardElementOptions} />
                </div>
              </div>

              <div className="form-group">
                <label>Name on card</label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="standard-input"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-pay" 
                disabled={isProcessing || !stripe}
              >
                {isProcessing ? (
                  <span className="btn-content"><Loader2 size={18} className="spinner" /> Processing...</span>
                ) : (
                  <span className="btn-content">Subscribe — ${price.toFixed(2)}/mo</span>
                )}
              </button>
              
              <div className="checkout-footer">
                <p>Payments are secure and encrypted. Powered by Stripe.</p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;

