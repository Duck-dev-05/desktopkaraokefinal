import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Crown, Sparkles, Ticket, Check, Zap, User, CreditCard, Calendar, Activity, Download, Mic2 } from 'lucide-react';
import './Premium.css';
import CheckoutModal from '../components/CheckoutModal';
import { useAuth } from '../context/AuthContext';
import { updateUserRole } from '../db';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx');

const STRIPE_PLANS = [
  { 
    name: 'Free Plan', 
    price: 0.00, 
    interval: '/forever', 
    priceId: 'free', 
    icon: <User size={32} className="card-icon free-icon" />, 
    isElite: false,
    features: ['480p Video Quality', 'Unlimited Karaoke Songs', 'Join Parties Only', 'No Offline Downloads']
  },
  { 
    name: 'Premium Tickets', 
    price: 45.00, 
    interval: '/mo', 
    priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_TICKETS || 'price_premium_tickets', 
    icon: <Sparkles size={32} className="card-icon vip-icon" />, 
    isElite: false,
    features: ['720p Video Quality', 'Unlimited Karaoke Songs', 'Host Party Rooms', 'Offline Downloads']
  },
  { 
    name: 'VIP Tickets', 
    price: 60.00, 
    interval: '/mo', 
    priceId: import.meta.env.VITE_STRIPE_PRICE_VIP_TICKETS || 'price_vip_tickets', 
    icon: <Ticket size={32} className="card-icon ticket-icon" />, 
    isElite: false,
    features: ['1080p Video Quality', 'Unlimited Karaoke Songs', 'Host Party Rooms', 'Offline Downloads']
  },
  { 
    name: 'Elite VIP', 
    price: 199.00, 
    interval: '/yr', 
    priceId: import.meta.env.VITE_STRIPE_PRICE_ELITE_VIP || 'price_elite_vip', 
    icon: <Crown size={32} className="card-icon elite-icon" />, 
    isElite: true,
    features: ['4K Video Quality', 'Unlimited Karaoke Songs', 'Host Party Rooms', 'Offline Downloads']
  }
];

const Premium = () => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{name: string, price: number, priceId: string} | null>(null);
  const [intentToShowPlans, setIntentToShowPlans] = useState(false);
  const { user, login } = useAuth();

  const hasActiveSubscription = user?.role && user.role !== 'user' && user.role !== 'admin';
  const shouldShowPlans = !hasActiveSubscription || intentToShowPlans;

  const handleSubscribe = async (name: string, price: number, priceId: string) => {
    if (!user) {
      alert("Please login first to subscribe.");
      return;
    }
    
    if (priceId === 'free') {
      try {
        const newRole = name.toLowerCase().replace(/\s+/g, '_');
        await updateUserRole(user.id, newRole);
        login({ ...user, role: newRole });
        alert(`You are now on the ${name}!`);
        setIntentToShowPlans(false);
      } catch (error) {
        console.error("Failed to downgrade subscription", error);
        alert("Failed to update your subscription status. Please contact support.");
      }
      return;
    }

    setSelectedPlan({ name, price, priceId });
    setIsCheckoutOpen(true);
  };

  const handleCheckoutComplete = async () => {
    setIsCheckoutOpen(false);
    
    if (user && selectedPlan) {
      try {
        const newRole = selectedPlan.name.toLowerCase().replace(/\s+/g, '_');
        await updateUserRole(user.id, newRole);
        login({ ...user, role: newRole });
        
        alert(`Thank you for upgrading to Karaoke ${selectedPlan.name}! Your subscription is now active.`);
        setIntentToShowPlans(false);
      } catch (error) {
        console.error("Failed to upgrade subscription", error);
        alert("Payment succeeded, but we failed to update your subscription status. Please contact support.");
      }
    }
  };

  if (!shouldShowPlans) {
    const currentPlan = STRIPE_PLANS.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === user?.role) || STRIPE_PLANS[1];
    
    return (
      <div className="premium-page animate-fade-in">
        <div className="premium-ambient-glow"></div>
        
        <div className="premium-header">
          <h1 className="premium-title">Manage <span className="premium-accent">Subscription</span></h1>
          <p className="premium-subtitle">View and manage your current Premium plan details.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%', maxWidth: '1000px', zIndex: 1 }}>
          
          {/* Main Plan Card */}
          <div className={`premium-card ${currentPlan.isElite ? 'elite-card' : ''}`} style={{ maxWidth: '100%' }}>
            {currentPlan.isElite && <div className="elite-badge-top">BEST VALUE</div>}
            
            <div className="card-header-top">
              <div className="card-icon-wrapper">
                {currentPlan.icon}
              </div>
              <h2 className="card-plan-name">{currentPlan.name}</h2>
              <div style={{ color: '#4facfe', marginTop: '12px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
                ● Active Plan
              </div>
            </div>
            
            <div className="card-pricing">
              <span className="card-currency">$</span>
              <span className="card-price-amount">{currentPlan.price.toFixed(2)}</span>
              <span className="card-price-interval">{currentPlan.interval}</span>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button 
                className="btn-subscribe-card" 
                style={{ flex: 1, background: 'rgba(255,255,255,0.1)' }}
                onClick={() => setIntentToShowPlans(true)}
              >
                Change Plan
              </button>
              <button 
                className="btn-subscribe-card" 
                style={{ flex: 1, color: '#f5576c', borderColor: 'rgba(245,87,108,0.3)', background: 'rgba(245,87,108,0.05)' }}
                onClick={() => alert("Cancellation would be handled by Stripe Customer Portal in production.")}
              >
                Cancel Subscription
              </button>
            </div>
          </div>

          {/* Right Column: Billing & Usage Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Billing Details */}
            <div className="premium-card" style={{ maxWidth: '100%', padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#a855f7" /> Billing Details
              </h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>Next Payment</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>Sept 1, 2026</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>Amount</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f093fb' }}>${currentPlan.price.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div style={{ background: '#fff', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '26px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 10" width="32" height="10" fill="#1434CB">
                    <path d="M12.44 9.68h2.02l1.28-8.15h-2.02l-1.28 8.15zM22.37 1.74c-.39-.18-1-.34-1.78-.34-1.99 0-3.39 1.06-3.41 2.58-.02 1.11 1 1.73 1.77 2.1.79.39 1.05.63 1.05 1 0 .54-.65.8-1.25.8-.84 0-1.29-.13-1.98-.44l-.28-.13-.28 1.75c.49.23 1.39.43 2.33.43 2.11 0 3.49-1.04 3.51-2.65.02-1.01-.6-1.78-1.68-2.3-.71-.35-1.15-.59-1.15-.96 0-.34.38-.7 1.19-.7.67 0 1.15.15 1.54.32l.18.08.24-1.54zM24.8 9.68h1.94l1.83-8.15h-1.68c-.3 0-.55.17-.67.44l-2.85 6.84-.13-.67-1.37-5.26a.8.8 0 0 0-.77-.6h-2.92l.04.18c.6.15 1.28.39 1.7.67.2.13.25.26.31.54l1.37 4.54-1.32 1.47zM9.54 1.53L7.73 7.03 7.2 4.14c-.11-.53-.45-.88-.95-1.04l-3-.94L3.33 2.3l2.09.4c.4.08.77.34.88.88l1.47 5.56h2.1L12 1.53H9.54z"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Visa ending in 4242</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Expires 12/28</div>
                </div>
                <button style={{ background: 'none', border: 'none', color: '#4facfe', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>Update</button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="premium-card" style={{ maxWidth: '100%', padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="#f5576c" /> Usage Statistics
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <Mic2 size={24} color="#4facfe" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>124</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Songs Sung</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                  <Download size={24} color="#f093fb" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>∞</div>
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Downloads</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page animate-fade-in">
      <div className="premium-ambient-glow"></div>
      
      <div className="premium-header">
        <h1 className="premium-title">Upgrade to <span className="premium-accent">Premium</span></h1>
        <p className="premium-subtitle">Select a plan from our catalog to unlock exclusive features.</p>
      </div>

      {hasActiveSubscription && (
        <div className="active-subscription-banner" style={{ cursor: 'pointer' }} onClick={() => setIntentToShowPlans(false)}>
          <Sparkles className="banner-icon" />
          <span>You are currently subscribed to the <strong>{STRIPE_PLANS.find(p => p.name.toLowerCase().replace(/\s+/g, '_') === user.role)?.name || 'Premium'}</strong> plan. Click here to manage.</span>
        </div>
      )}

      <div className="premium-cards-container">
        {STRIPE_PLANS.map((plan, index) => (
          <div key={index} className={`premium-card ${plan.isElite ? 'elite-card' : ''}`}>
            {plan.isElite && <div className="elite-badge-top">BEST VALUE</div>}
            
            <div className="card-header-top">
              <div className="card-icon-wrapper">
                {plan.icon}
              </div>
              <h2 className="card-plan-name">{plan.name}</h2>
            </div>
            
            <div className="card-pricing">
              <span className="card-currency">$</span>
              <span className="card-price-amount">{plan.price.toFixed(2)}</span>
              <span className="card-price-interval">{plan.interval}</span>
            </div>

            <div className="card-features-list">
              {plan.features.map((feature, fIndex) => (
                <div key={fIndex} className="card-feature-item">
                  <Check size={18} className={`check-icon ${plan.isElite ? 'elite-check' : ''}`} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            {(() => {
              const planRole = plan.name.toLowerCase().replace(/\s+/g, '_');
              const isCurrentPlan = user?.role === planRole;
              
              if (isCurrentPlan) {
                return (
                  <button className="btn-subscribe-card btn-active-plan" disabled>
                    Current Plan <Check size={16} />
                  </button>
                );
              }
              
              return (
                <button 
                  className={`btn-subscribe-card ${plan.isElite ? 'btn-elite' : ''}`}
                  onClick={() => handleSubscribe(plan.name, plan.price, plan.priceId)}
                >
                  {hasActiveSubscription ? 'Switch Plan' : 'Subscribe Now'} <Zap size={16} className="btn-zap-icon" />
                </button>
              );
            })()}
          </div>
        ))}
      </div>

      {isCheckoutOpen && selectedPlan && (
        <Elements stripe={stripePromise}>
          <CheckoutModal 
            planName={selectedPlan.name} 
            price={selectedPlan.price} 
            priceId={selectedPlan.priceId}
            onClose={() => setIsCheckoutOpen(false)}
            onSuccess={handleCheckoutComplete}
          />
        </Elements>
      )}
    </div>
  );
};

export default Premium;
