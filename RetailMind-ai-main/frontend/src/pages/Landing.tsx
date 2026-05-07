import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const STATS = [
  { value: "~5%", label: "Revenue lost to fraud" },
  { value: "2–5%", label: "Lost to expired stock" },
  { value: "1–3%", label: "Pricing errors" },
  { value: "24/7", label: "AI watching your business" },
];

const PROBLEMS = [
  {
    icon: "🔍",
    title: "Internal Fraud",
    pct: "~5%",
    desc: "Cashiers cancelling transactions, ghost staff payroll, and till manipulation happen silently every day.",
  },
  {
    icon: "📦",
    title: "Expired Stock",
    pct: "2–5%",
    desc: "Products expire on shelves. No alerts. Dead inventory sitting while cash flow suffers.",
  },
  {
    icon: "🏷️",
    title: "Pricing Errors",
    pct: "1–3%",
    desc: "Manual price entry mistakes and promotions not removed in time drain margins invisibly.",
  },
];

const HOW = [
  {
    step: "01",
    title: "Sign Up Free",
    desc: "60 seconds. No credit card. Instantly get 14 days of full access + 100 bonus AI credits.",
  },
  {
    step: "02",
    title: "Add Your Shop & Products",
    desc: "Add branches, import products, invite staff. AI starts learning your patterns immediately.",
  },
  {
    step: "03",
    title: "AI Starts Protecting You",
    desc: "Fraud detection activates. Expiry tracking starts. Every transaction monitored. Alerts in real time.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₵0",
    period: "/month",
    tag: null,
    desc: "Try RetailMind with core POS & inventory tools",
    features: ["Up to 50 products", "1 branch location", "2 staff accounts", "Up to 500 sales/month"],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Starter",
    price: "₵169",
    period: "/month",
    tag: null,
    desc: "Expand your business with AI insights, QR scanning, and multi-shop support",
    features: ["Up to 500 products", "Up to 3 branch locations", "10 staff accounts", "Up to 5000 sales/month"],
    cta: "Start Starter",
    highlight: false,
  },
  {
    name: "Professional",
    price: "₵469",
    period: "/month",
    tag: "MOST POPULAR",
    desc: "Everything you need to run a serious retail operation with full AI power",
    features: ["Up to 5000 products", "Up to 10 branch locations", "50 staff accounts", "Unlimited sales"],
    cta: "Go Professional",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: " pricing",
    tag: null,
    desc: "Unlimited capacity and dedicated support for large-scale retail chains",
    features: ["Unlimited everything", "All Professional features", "Unlimited AI Reports", "Dedicated support"],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((v) => new Set([...v, e.target.id]));
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const isVisible = (id: string) => visible.has(id);

  return (
    <div className="landing-root" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .landing-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .landing-root { background: #0a0a0a; color: #f0f0f0; overflow-x: hidden; }

        /* NAV */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 5vw; height: 68px;
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background 0.3s;
        }
        .lp-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .lp-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .lp-logo-text { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: #fff; }
        .lp-nav-links { display: flex; gap: 32px; list-style: none; }
        .lp-nav-links a { color: rgba(255,255,255,0.65); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .lp-nav-links a:hover { color: #fff; }
        .lp-nav-actions { display: flex; gap: 12px; }
        .btn-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.18); color: #fff; padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .btn-ghost:hover { background: rgba(255,255,255,0.08); }
        .btn-primary { background: #22c55e; border: none; color: #000; padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .btn-primary:hover { background: #16a34a; transform: translateY(-1px); }

        /* HERO */
        .lp-hero {
          min-height: 100vh; display: flex; align-items: center;
          padding: 100px 5vw 80px;
          position: relative; overflow: hidden;
          background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(34,197,94,0.12) 0%, transparent 70%),
                      radial-gradient(ellipse 50% 50% at 10% 80%, rgba(34,197,94,0.06) 0%, transparent 60%),
                      #0a0a0a;
        }
        .hero-grid-bg {
          position: absolute; inset: 0; pointer-events: none;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
          color: #22c55e; padding: 6px 14px; border-radius: 100px;
          font-size: 13px; font-weight: 600; margin-bottom: 28px;
          animation: fadeUp 0.6s ease both;
        }
        .hero-badge::before { content: ''; width: 7px; height: 7px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideRight { from{opacity:0;transform:translateX(-30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }
        @keyframes scaleUp { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }

        .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; max-width: 1200px; margin: 0 auto; width: 100%; position: relative; z-index: 1; }
        .hero-h1 {
          font-family: 'Syne', sans-serif; font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 800; line-height: 1.1; margin-bottom: 20px;
          animation: fadeUp 0.7s 0.1s ease both;
        }
        .hero-h1 .accent { color: #22c55e; }
        .hero-sub { font-size: 17px; color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: 36px; max-width: 460px; animation: fadeUp 0.7s 0.2s ease both; }
        .hero-ctas { display: flex; gap: 14px; flex-wrap: wrap; animation: fadeUp 0.7s 0.3s ease both; }
        .btn-lg { padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .btn-green-lg { background: #22c55e; border: none; color: #000; }
        .btn-green-lg:hover { background: #16a34a; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(34,197,94,0.3); }
        .btn-outline-lg { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; }
        .btn-outline-lg:hover { background: rgba(255,255,255,0.06); }

        .hero-stats { display: flex; gap: 32px; margin-top: 48px; animation: fadeUp 0.7s 0.4s ease both; }
        .hero-stat-num { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #22c55e; }
        .hero-stat-label { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }

        /* DASHBOARD CARD */
        .hero-dashboard {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 24px; backdrop-filter: blur(10px);
          animation: slideLeft 0.9s 0.3s ease both;
          box-shadow: 0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(34,197,94,0.1);
        }
        .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .dash-title { font-weight: 700; font-size: 15px; }
        .dash-live { background: rgba(34,197,94,0.15); color: #22c55e; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 100px; letter-spacing: 0.05em; }
        .dash-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .dash-metric { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; }
        .dash-metric-label { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 6px; }
        .dash-metric-val { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #22c55e; }
        .dash-metric-sub { font-size: 11px; color: rgba(34,197,94,0.7); margin-top: 3px; }
        .dash-metric-val2 { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #60a5fa; }
        .dash-metric-sub2 { font-size: 11px; color: rgba(96,165,250,0.7); margin-top: 3px; }
        .dash-ai-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
        .dash-ai-label { font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .dash-ai-q { font-size: 13px; font-style: italic; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
        .dash-ai-a { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.5; }
        .dash-alert { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 12px; padding: 14px; display: flex; gap: 10px; align-items: flex-start; }
        .dash-alert-icon { color: #ef4444; font-size: 16px; flex-shrink: 0; margin-top: 1px; }
        .dash-alert-title { font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 3px; }
        .dash-alert-sub { font-size: 11px; color: rgba(239,68,68,0.7); }

        /* SECTIONS */
        .lp-section { padding: 100px 5vw; max-width: 1200px; margin: 0 auto; }
        .section-tag { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #22c55e; margin-bottom: 14px; }
        .section-h2 { font-family: 'Syne', sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 800; line-height: 1.15; margin-bottom: 16px; }
        .section-sub { font-size: 16px; color: rgba(255,255,255,0.5); max-width: 520px; line-height: 1.7; }

        /* BLEEDING MONEY */
        .bleed-section { padding: 80px 5vw; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
        .bleed-inner { max-width: 1200px; margin: 0 auto; }
        .bleed-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 56px; }
        .bleed-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .bleed-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #22c55e, transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .bleed-card:hover { border-color: rgba(34,197,94,0.2); transform: translateY(-4px); }
        .bleed-card:hover::before { opacity: 1; }
        .bleed-icon { font-size: 28px; margin-bottom: 16px; }
        .bleed-pct { font-family: 'Syne', sans-serif; font-size: 2.5rem; font-weight: 800; color: #f97316; margin-bottom: 8px; }
        .bleed-title { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
        .bleed-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }

        /* ANIMATE ON SCROLL */
        .anim-fadeup { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .anim-fadeup.visible { opacity: 1; transform: none; }
        .anim-delay-1 { transition-delay: 0.1s; }
        .anim-delay-2 { transition-delay: 0.2s; }
        .anim-delay-3 { transition-delay: 0.3s; }

        /* HOW IT WORKS */
        .how-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 56px; }
        .how-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 32px; text-align: center; position: relative;
        }
        .how-step {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #000; font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
        }
        .how-title { font-size: 17px; font-weight: 700; margin-bottom: 10px; }
        .how-desc { font-size: 14px; color: rgba(255,255,255,0.5); line-height: 1.6; }
        .how-connector {
          position: absolute; top: 52px; right: -16px; width: 32px; height: 1px;
          background: linear-gradient(90deg, rgba(34,197,94,0.4), transparent);
        }

        /* PRICING */
        .pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 56px; }
        .pricing-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px; position: relative; display: flex; flex-direction: column;
        }
        .pricing-card.featured {
          background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.3);
          box-shadow: 0 0 40px rgba(34,197,94,0.1);
        }
        .pricing-tag {
          position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
          background: #22c55e; color: #000; font-size: 10px; font-weight: 800;
          padding: 4px 12px; border-radius: 100px; letter-spacing: 0.08em; white-space: nowrap;
        }
        .pricing-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; margin-bottom: 6px; }
        .pricing-price { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; color: #22c55e; }
        .pricing-price span { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.4); }
        .pricing-desc { font-size: 13px; color: rgba(255,255,255,0.45); margin: 12px 0 20px; line-height: 1.5; }
        .pricing-features { list-style: none; margin-bottom: 24px; flex: 1; }
        .pricing-features li { font-size: 13px; color: rgba(255,255,255,0.65); padding: 6px 0; display: flex; gap: 8px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .pricing-features li::before { content: '✓'; color: #22c55e; font-weight: 700; flex-shrink: 0; }
        .pricing-cta { width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .pricing-cta-featured { background: #22c55e; border: none; color: #000; }
        .pricing-cta-featured:hover { background: #16a34a; }
        .pricing-cta-ghost { background: transparent; border: 1px solid rgba(255,255,255,0.15); color: #fff; }
        .pricing-cta-ghost:hover { background: rgba(255,255,255,0.05); }

        /* CTA SECTION */
        .lp-cta-section {
          padding: 100px 5vw; text-align: center;
          background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,197,94,0.08), transparent 70%);
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .lp-cta-h2 { font-family: 'Syne', sans-serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 800; margin-bottom: 16px; }
        .lp-cta-sub { font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 36px; }

        /* FOOTER */
        .lp-footer {
          border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 5vw;
          display: flex; justify-content: space-between; align-items: center;
          max-width: 1200px; margin: 0 auto;
          color: rgba(255,255,255,0.3); font-size: 13px;
        }

        /* METRIC BAR */
        .metric-bar {
          background: #111; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 32px 5vw;
        }
        .metric-bar-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; text-align: center; }
        .metric-bar-num { font-family: 'Syne', sans-serif; font-size: 2rem; font-weight: 800; color: #22c55e; }
        .metric-bar-label { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }

        @media (max-width: 900px) {
          .hero-inner { grid-template-columns: 1fr; }
          .bleed-grid, .how-grid { grid-template-columns: 1fr; }
          .pricing-grid { grid-template-columns: 1fr 1fr; }
          .how-connector { display: none; }
        }
        @media (max-width: 600px) {
          .pricing-grid { grid-template-columns: 1fr; }
          .metric-bar-inner { grid-template-columns: 1fr 1fr; }
          .lp-nav-links { display: none; }
        }
      `}</style>

      {/* NAV */}
      <nav className="lp-nav">
        <a href="#" className="lp-logo">
          <div className="lp-logo-icon">🛒</div>
          <span className="lp-logo-text">RetailMind AI</span>
        </a>
        <ul className="lp-nav-links">
          <li><a href="#how">How It Works</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#">Support</a></li>
        </ul>
        <div className="lp-nav-actions">
          <button className="btn-ghost" onClick={() => navigate("/dashboard")}>Login</button>
          <button className="btn-primary" onClick={() => navigate("/register")}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero" ref={heroRef}>
        <div className="hero-grid-bg" />
        <div className="hero-inner">
          <div>
            <div className="hero-badge">Businesses lose 3–8% of revenue to fraud every month</div>
            <h1 className="hero-h1">
              Stop Watching Money<br />
              Walk Out The Door.<br />
              <span className="accent">RetailMind Ends It.</span>
            </h1>
            <p className="hero-sub">
              Internal fraud. Expired stock. Ghost staff. Pricing errors. RetailMind AI detects every leak in real time — before it becomes a loss you can't recover.
            </p>
            <div className="hero-ctas">
              <button className="btn-lg btn-green-lg" onClick={() => navigate("/register")}>
                Start Free — No Card Needed →
              </button>
              <button className="btn-lg btn-outline-lg">Book a Demo</button>
            </div>
            <div className="hero-stats">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="hero-stat-num">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="hero-dashboard">
            <div className="dash-header">
              <span className="dash-title">🛡️ RetailMind AI Dashboard</span>
              <span className="dash-live">● LIVE</span>
            </div>
            <div className="dash-metrics">
              <div className="dash-metric">
                <div className="dash-metric-label">Today's Revenue</div>
                <div className="dash-metric-val">₵12,450</div>
                <div className="dash-metric-sub">↑ 18% vs yesterday</div>
              </div>
              <div className="dash-metric">
                <div className="dash-metric-label">Transactions</div>
                <div className="dash-metric-val2">156</div>
                <div className="dash-metric-sub2">3 branches active</div>
              </div>
            </div>
            <div className="dash-ai-box">
              <div className="dash-ai-label">🤖 AI Command Agent</div>
              <div className="dash-ai-q">"Show me today's sales performance"</div>
              <div className="dash-ai-a">Revenue is up 18%. Top product: Coca-Cola 500ml (42 units). Busiest hour: 12–1 PM.</div>
            </div>
            <div className="dash-alert">
              <div className="dash-alert-icon">⚠️</div>
              <div>
                <div className="dash-alert-title">Fraud Alert: Suspicious cancellation pattern detected</div>
                <div className="dash-alert-sub">Cashier cancelled 3 transactions in 15 minutes — AI confidence: 87%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METRIC BAR */}
      <div className="metric-bar">
        <div className="metric-bar-inner">
          <div>
            <div className="metric-bar-num">3–8%</div>
            <div className="metric-bar-label">Of revenue recovered</div>
          </div>
          <div>
            <div className="metric-bar-num">Zero</div>
            <div className="metric-bar-label">Expired products sold</div>
          </div>
          <div>
            <div className="metric-bar-num">24/7</div>
            <div className="metric-bar-label">AI watching every transaction</div>
          </div>
          <div>
            <div className="metric-bar-num">60s</div>
            <div className="metric-bar-label">To sign up and start</div>
          </div>
        </div>
      </div>

      {/* BLEEDING MONEY */}
      <div className="bleed-section">
        <div className="bleed-inner">
          <div
            id="bleed-head"
            data-animate
            className={`anim-fadeup${isVisible("bleed-head") ? " visible" : ""}`}
            style={{ textAlign: "center" }}
          >
            <span className="section-tag">⚠ Based on Real Industry Data</span>
            <h2 className="section-h2">Right Now, Your Business Is Bleeding Money.</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              These aren't guesses. Research shows businesses lose <strong style={{ color: "#f97316" }}>3–8% of revenue</strong> every month to fraud, spoilage, and operational errors — and in Africa, the rates are even higher.
            </p>
          </div>
          <div className="bleed-grid">
            {PROBLEMS.map((p, i) => (
              <div
                key={p.title}
                id={`bleed-${i}`}
                data-animate
                className={`bleed-card anim-fadeup anim-delay-${i + 1}${isVisible(`bleed-${i}`) ? " visible" : ""}`}
              >
                <div className="bleed-icon">{p.icon}</div>
                <div className="bleed-pct">{p.pct}</div>
                <div className="bleed-title">{p.title}</div>
                <div className="bleed-desc">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section id="how">
        <div className="lp-section">
          <div
            id="how-head"
            data-animate
            className={`anim-fadeup${isVisible("how-head") ? " visible" : ""}`}
            style={{ textAlign: "center" }}
          >
            <span className="section-tag">⚡ Takes Less Than 60 Seconds</span>
            <h2 className="section-h2">Start Protecting Your Business in 3 Steps</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              No technical skills. No long setup. No credit card. Just sign up and your AI protection starts immediately.
            </p>
          </div>
          <div className="how-grid">
            {HOW.map((h, i) => (
              <div
                key={h.step}
                id={`how-${i}`}
                data-animate
                className={`how-card anim-fadeup anim-delay-${i + 1}${isVisible(`how-${i}`) ? " visible" : ""}`}
                style={{ position: "relative" }}
              >
                <div className="how-step">{h.step}</div>
                <div className="how-title">{h.title}</div>
                <div className="how-desc">{h.desc}</div>
                {i < HOW.length - 1 && <div className="how-connector" />}
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <button className="btn-lg btn-green-lg" onClick={() => navigate("/register")}>
              Protect My Business — Start Free →
            </button>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: "rgba(255,255,255,0.015)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="lp-section">
          <div
            id="price-head"
            data-animate
            className={`anim-fadeup${isVisible("price-head") ? " visible" : ""}`}
            style={{ textAlign: "center" }}
          >
            <span className="section-tag">💰 The cost of doing nothing is higher</span>
            <h2 className="section-h2">How Much Are You Losing Every Month?</h2>
            <p className="section-sub" style={{ margin: "0 auto" }}>
              Your business is losing 3–8% of revenue every month. RetailMind AI costs a tiny fraction of what you're already losing — and pays for itself in the first week.
            </p>
          </div>
          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                id={`plan-${i}`}
                data-animate
                className={`pricing-card anim-fadeup anim-delay-${i + 1}${plan.highlight ? " featured" : ""}${isVisible(`plan-${i}`) ? " visible" : ""}`}
              >
                {plan.tag && <div className="pricing-tag">{plan.tag}</div>}
                <div className="pricing-name">{plan.name}</div>
                <div className="pricing-price">
                  {plan.price}<span>{plan.period}</span>
                </div>
                <div className="pricing-desc">{plan.desc}</div>
                <ul className="pricing-features">
                  {plan.features.map((f) => <li key={f}>{f}</li>)}
                </ul>
                <button
                  className={`pricing-cta ${plan.highlight ? "pricing-cta-featured" : "pricing-cta-ghost"}`}
                  onClick={() => navigate("/register")}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="lp-cta-section">
        <div
          id="final-cta"
          data-animate
          className={`anim-fadeup${isVisible("final-cta") ? " visible" : ""}`}
        >
          <h2 className="lp-cta-h2">Every Day Without AI Protection<br />Is Revenue You Won't Get Back.</h2>
          <p className="lp-cta-sub">Join retailers already protecting their profits with RetailMind AI.</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-lg btn-green-lg" onClick={() => navigate("/register")}>
              Start Free — 14 Days Full Access →
            </button>
            <button className="btn-lg btn-outline-lg">Book a Demo</button>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
            256-bit SSL · Encrypted · No credit card required
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="lp-footer">
          <span>© 2025 RetailMind AI by Amuzara AI. All rights reserved.</span>
          <span>Built for African Retail Businesses</span>
        </div>
      </footer>
    </div>
  );
}