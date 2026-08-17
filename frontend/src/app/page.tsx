'use client';

import Link from 'next/link';
import './landing.css';

export default function Home() {
  return (
    <div className="landingPage">
      <nav className="navbar glass">
        <div className="navLogo">
          <span>LuxDrive</span>
        </div>
        <div className="navLinks">
          <Link href="/login" className="loginLink">Sign In</Link>
          <Link href="/register" className="registerBtn">Get Started</Link>
        </div>
      </nav>

      <header className="hero">
        <div className="heroContent">
          <span className="badge">New Era of Car Rental</span>
          <h1>Manage Your Fleet with <span className="gradientText">Intelligence</span></h1>
          <p>The ultimate B2B platform for car rental agencies. Streamline operations, manage bookings, and scale your business with ease.</p>
          <div className="heroActions">
            <Link href="/login" className="primaryBtn">
              Access Admin Dashboard
            </Link>
            <Link href="/register" className="secondaryBtn">Register Agency</Link>
          </div>
        </div>
        <div className="heroImage glass">
          {/* Mockup for fleet visibility */}
          <div className="mockupContent">
            <div className="mockupStat">
              <div>
                <span>Active Fleet</span>
                <strong>124 Vehicles</strong>
              </div>
            </div>
            <div className="mockupStat">
              <div>
                <span>Daily Revenue</span>
                <strong>4,250 MAD</strong>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        <div className="featureCard glass">
          <h3>Secure &amp; Verified</h3>
          <p>Multi-step agency verification and secure payment processing for every rental.</p>
        </div>
        <div className="featureCard glass">
          <h3>Real-time Tracking</h3>
          <p>Monitor your entire fleet in real-time with integrated GPS and status updates.</p>
        </div>
        <div className="featureCard glass">
          <h3>B2B Focused</h3>
          <p>Specific tools designed for agency-to-business and agency-to-client operations.</p>
        </div>
      </section>
    </div>
  );
}
