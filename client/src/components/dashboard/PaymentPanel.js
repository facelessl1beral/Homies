import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Mobile money payment panel — PRESENTATION ONLY.
 *
 * =========================================================================
 * THIS COMPONENT DOES NOT TAKE PAYMENTS. It never contacts a payment
 * provider, never transmits a phone number, and never changes any booking
 * state. It renders the interface a student would use, so the payment step
 * can be shown and discussed, and so the integration work is scoped rather
 * than imagined.
 * =========================================================================
 *
 * Why it is built this way
 *
 * A payment form that looks real and does nothing is dangerous in exactly one
 * way: someone might believe they have paid. Every safeguard here exists to
 * make that impossible.
 *
 *   - A permanent, non-dismissible notice at the top of the panel.
 *   - The action button says "Preview payment request", never "Pay".
 *   - The result state says explicitly that no money moved.
 *   - No network call of any kind is made.
 *
 * The Uganda-specific parts are real and worth keeping: MTN MoMo and Airtel
 * Money are how students at KYU actually pay, card penetration is low, and
 * the prefix-to-network mapping below is the genuine Ugandan numbering plan.
 * Those details are the part of this that would survive into a real
 * integration.
 *
 * What a real integration needs, beyond this file:
 *   1. A Payment model — amount, currency, provider, providerRef, status,
 *      studentId, bookingId, createdAt. Payments must be recorded before they
 *      are attempted, or a crash mid-flow loses the record of an attempt.
 *   2. A server-side endpoint that initiates the charge. The provider secret
 *      key never reaches the browser.
 *   3. A webhook receiver for the provider's asynchronous callback. Mobile
 *      money confirms out of band, after the user approves on their handset,
 *      which can be minutes later. The UI cannot wait on it.
 *   4. Idempotency keys, so a retried request cannot charge twice.
 *   5. Signature verification on the webhook, so a forged callback cannot
 *      mark an unpaid booking as paid. This is the security-critical piece.
 *   6. Reconciliation for the states that are neither success nor failure:
 *      timeout, insufficient funds, user declined on handset, provider
 *      unreachable.
 *
 * Items 4 and 5 are the reason this is not a small job. Anything that moves
 * money belongs in the top testing tier, with tests written before the
 * implementation.
 */

const NETWORKS = [
  { id: 'mtn',    label: 'MTN MoMo',     prefixes: ['077', '078', '076', '039'], hint: 'e.g. 0771 234 567' },
  { id: 'airtel', label: 'Airtel Money', prefixes: ['070', '075', '074', '020'], hint: 'e.g. 0701 234 567' },
];

const detectNetwork = phone => {
  const digits = (phone || '').replace(/\D/g, '');
  const local = digits.startsWith('256') ? '0' + digits.slice(3) : digits;
  return NETWORKS.find(n => n.prefixes.some(p => local.startsWith(p))) || null;
};

const PaymentPanel = ({ amount = 150000, currency = 'UGX', hostelName, roomNumber }) => {
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState('');
  const [preview, setPreview] = useState(false);

  const detected = detectNetwork(phone);
  const chosen = network || (detected && detected.id);
  const digits = phone.replace(/\D/g, '');
  const phoneLooksValid = digits.length >= 9 && !!detected;
  const canPreview = phoneLooksValid && !!chosen;

  const formatted = new Intl.NumberFormat('en-UG').format(amount);

  const pill = (active, onClick, key, children) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 18px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
        border: `1px solid ${active ? 'var(--accent-purple)' : 'var(--border)'}`,
        background: active ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
        color: active ? '#fff' : 'var(--text-primary)',
        fontSize: '0.88rem', fontWeight: active ? 600 : 400, marginRight: '8px',
        // A selected provider gets a lift and a glow. The panel takes no money,
        // but the controls should still respond like real controls — an
        // interface that feels inert reads as broken, and a reviewer cannot
        // tell "deliberately not wired up" from "does not work".
        boxShadow: active ? '0 4px 16px rgba(124,58,237,0.38)' : 'none',
        transform: active ? 'translateY(-1px)' : 'none',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease',
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginTop: '1.5rem',
    }}>

      {/* Not dismissible. A student must not be able to hide this and then
          believe the form below took their money. */}
      <div
        role="note"
        style={{
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '1.25rem',
          fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5,
        }}
      >
        <strong>Prototype — no payment is taken.</strong> This screen demonstrates
        the intended mobile money flow. Nothing is sent to MTN or Airtel and no
        money moves. Hostel fees are currently arranged directly with the hostel.
      </div>

      <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.25rem', fontSize: '1.1rem' }}>
        Pay your hostel deposit
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
        {hostelName ? `${hostelName}` : 'Your hostel'}
        {roomNumber ? ` · Room ${roomNumber}` : ''}
      </p>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        padding: '0.85rem 1rem', background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)', marginBottom: '1.25rem',
      }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Amount due</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}>
          {currency} {formatted}
        </span>
      </div>

      <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Network
      </label>
      <div style={{ marginBottom: '1.25rem' }}>
        {NETWORKS.map(n => pill(chosen === n.id, () => setNetwork(n.id), n.id, n.label))}
      </div>

      <label htmlFor="momo-phone" style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        Mobile money number
      </label>
      <input
        id="momo-phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={phone}
        onChange={e => { setPhone(e.target.value); setPreview(false); }}
        placeholder={(NETWORKS.find(n => n.id === chosen) || NETWORKS[0]).hint}
        style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)',
          padding: '10px 14px', width: '100%', fontSize: '0.95rem',
        }}
      />

      {/* Network detection from the prefix, so a student who types a number
          does not also have to know which pill to press. */}
      {phone.length > 3 && (
        <small style={{
          display: 'block', marginTop: '6px', fontSize: '0.78rem',
          color: detected ? 'var(--success, #10b981)' : 'var(--warning, #f59e0b)',
        }}>
          {detected
            ? `Detected ${detected.label}`
            : 'Not a recognised MTN or Airtel prefix'}
        </small>
      )}

      <button
        type="button"
        disabled={!canPreview}
        onClick={() => setPreview(true)}
        style={{
          marginTop: '1.25rem', width: '100%', padding: '12px',
          border: 'none', borderRadius: 'var(--radius-sm)',
          background: canPreview ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
          color: canPreview ? '#fff' : 'var(--text-muted)',
          fontWeight: 700, fontSize: '0.95rem',
          cursor: canPreview ? 'pointer' : 'not-allowed',
        }}
        className={canPreview ? 'pay-cta pay-cta--ready' : 'pay-cta'}
      >
        Preview payment request
      </button>

      {preview && (
        <div
          role="status"
          style={{
            marginTop: '1.25rem', padding: '1rem',
            background: 'var(--bg-secondary)', border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)', fontSize: '0.86rem',
            color: 'var(--text-secondary)', lineHeight: 1.6,
          }}
        >
          <p style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            What would happen next
          </p>
          <p style={{ margin: '0 0 0.5rem' }}>
            A charge of <strong style={{ color: 'var(--text-primary)' }}>{currency} {formatted}</strong> would
            be requested from <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong> via {(NETWORKS.find(n => n.id === chosen) || {}).label}.
            You would approve it by entering your PIN on your handset, and the
            booking would be marked paid only after the provider confirmed it.
          </p>
          <p style={{ margin: 0, color: 'var(--warning, #f59e0b)', fontWeight: 600 }}>
            Nothing was sent and no money has moved.
          </p>
        </div>
      )}
    </div>
  );
};

PaymentPanel.propTypes = {
  amount: PropTypes.number,
  currency: PropTypes.string,
  hostelName: PropTypes.string,
  roomNumber: PropTypes.string,
};

export default PaymentPanel;
