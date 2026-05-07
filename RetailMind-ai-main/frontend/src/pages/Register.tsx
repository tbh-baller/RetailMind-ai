import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [show, setShow] = useState(false);
  const [showC, setShowC] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", password: "", confirmPassword: "",
    businessName: "", businessType: "", country: "", city: "",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ minHeight: "100vh", background: "#0f1a0f", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reg-nav { display:flex; align-items:center; justify-content:space-between; padding:0 5vw; height:64px; border-bottom:1px solid rgba(255,255,255,0.06); }
        .reg-logo { display:flex; align-items:center; gap:10px; text-decoration:none; cursor:pointer; }
        .reg-logo-icon { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#22c55e,#16a34a); display:flex; align-items:center; justify-content:center; font-size:17px; }
        .reg-logo-text { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#fff; }
        .reg-card { background:#fff; border-radius:20px; padding:40px 36px; width:100%; max-width:480px; margin:40px auto; }
        .reg-card-icon { width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,#22c55e,#16a34a); display:flex; align-items:center; justify-content:center; font-size:26px; margin:0 auto 18px; }
        .reg-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#111; text-align:center; margin-bottom:4px; }
        .reg-sub { font-size:13px; color:#888; text-align:center; margin-bottom:24px; }
        .reg-steps { display:flex; align-items:center; justify-content:center; gap:0; margin-bottom:28px; }
        .reg-step { display:flex; align-items:center; gap:8px; }
        .reg-step-num { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; }
        .reg-step-num.active { background:#22c55e; color:#fff; }
        .reg-step-num.inactive { background:#f0f0f0; color:#999; }
        .reg-step-label { font-size:13px; font-weight:600; }
        .reg-step-label.active { color:#111; }
        .reg-step-label.inactive { color:#bbb; }
        .reg-step-line { width:60px; height:1px; background:#e5e7eb; margin:0 8px; }
        .reg-section-label { font-size:11px; font-weight:700; letter-spacing:0.1em; color:#22c55e; text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:6px; }
        .reg-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
        .reg-field { margin-bottom:12px; }
        .reg-label { font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; display:block; }
        .reg-input { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:11px 14px; font-size:14px; font-family:inherit; color:#111; outline:none; transition:border 0.2s; background:#fafafa; }
        .reg-input:focus { border-color:#22c55e; background:#fff; }
        .reg-input-icon { position:relative; }
        .reg-input-icon .reg-input { padding-left:38px; }
        .reg-input-icon .icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#aaa; font-size:15px; }
        .reg-input-icon .icon-right { position:absolute; right:12px; top:50%; transform:translateY(-50%); color:#aaa; font-size:15px; cursor:pointer; }
        .reg-select { width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:11px 14px; font-size:14px; font-family:inherit; color:#111; outline:none; background:#fafafa; appearance:none; }
        .reg-select:focus { border-color:#22c55e; }
        .reg-btn { width:100%; padding:14px; border-radius:10px; background:#22c55e; border:none; color:#fff; font-size:15px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.2s; margin-top:8px; }
        .reg-btn:hover { background:#16a34a; transform:translateY(-1px); }
        .reg-signin { text-align:center; margin-top:16px; font-size:13px; color:#888; }
        .reg-signin a { color:#22c55e; font-weight:600; cursor:pointer; text-decoration:none; }
        .reg-trust { display:flex; justify-content:center; gap:16px; margin-top:14px; }
        .reg-trust span { font-size:12px; color:#bbb; display:flex; align-items:center; gap:4px; }
      `}</style>

      {/* Nav */}
      <nav className="reg-nav">
        <div className="reg-logo" onClick={() => navigate("/")}>
          <div className="reg-logo-icon">🛒</div>
          <span className="reg-logo-text">RetailMind AI</span>
        </div>
        <span style={{ fontSize: 13, color: "#aaa" }}>Already have an account? <a onClick={() => navigate("/dashboard")} style={{ color: "#22c55e", fontWeight: 600, cursor: "pointer" }}>Sign in</a></span>
      </nav>

      {/* Card */}
      <div style={{ flex: 1, padding: "0 16px", display: "flex", alignItems: "flex-start" }}>
        <div className="reg-card">
          <div className="reg-card-icon">🛡️</div>
          <div className="reg-title">Create Your Account</div>
          <div className="reg-sub">Get 14 days + 100 bonus AI credits — no credit card required<br /><span style={{ color: "#22c55e", fontWeight: 600 }}>RetailMind AI by Amuzara AI</span></div>

          {/* Steps */}
          <div className="reg-steps">
            <div className="reg-step">
              <div className={`reg-step-num ${step === 1 ? "active" : "inactive"}`}>1</div>
              <span className={`reg-step-label ${step === 1 ? "active" : "inactive"}`}>Your Info</span>
            </div>
            <div className="reg-step-line" />
            <div className="reg-step">
              <div className={`reg-step-num ${step === 2 ? "active" : "inactive"}`}>2</div>
              <span className={`reg-step-label ${step === 2 ? "active" : "inactive"}`}>Business</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              <div className="reg-section-label">👤 Personal Information</div>
              <div className="reg-row">
                <div className="reg-field">
                  <label className="reg-label">First Name</label>
                  <input className="reg-input" placeholder="Kwame" value={form.firstName} onChange={set("firstName")} />
                </div>
                <div className="reg-field">
                  <label className="reg-label">Last Name</label>
                  <input className="reg-input" placeholder="Mensah" value={form.lastName} onChange={set("lastName")} />
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Email Address</label>
                <div className="reg-input-icon">
                  <span className="icon">✉️</span>
                  <input className="reg-input" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Phone Number <span style={{ color: "#bbb", fontWeight: 400 }}>(optional)</span></label>
                <div className="reg-input-icon">
                  <span className="icon">📱</span>
                  <input className="reg-input" placeholder="0241234567" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Password</label>
                <div className="reg-input-icon">
                  <span className="icon">🔒</span>
                  <input className="reg-input" type={show ? "text" : "password"} placeholder="Min. 8 characters" value={form.password} onChange={set("password")} />
                  <span className="icon-right" onClick={() => setShow(!show)}>{show ? "🙈" : "👁️"}</span>
                </div>
              </div>
              <div className="reg-field">
                <label className="reg-label">Confirm Password</label>
                <div className="reg-input-icon">
                  <span className="icon">🔒</span>
                  <input className="reg-input" type={showC ? "text" : "password"} placeholder="Re-enter password" value={form.confirmPassword} onChange={set("confirmPassword")} />
                  <span className="icon-right" onClick={() => setShowC(!showC)}>{showC ? "🙈" : "👁️"}</span>
                </div>
              </div>
              <button className="reg-btn" onClick={() => setStep(2)}>Continue →</button>
            </>
          ) : (
            <>
              <div className="reg-section-label">🏪 Business Information</div>
              <div className="reg-field">
                <label className="reg-label">Business Name</label>
                <input className="reg-input" placeholder="e.g. Mensah Supermart" value={form.businessName} onChange={set("businessName")} />
              </div>
              <div className="reg-field">
                <label className="reg-label">Business Type</label>
                <select className="reg-select" value={form.businessType} onChange={set("businessType")}>
                  <option value="">Select type...</option>
                  <option>Supermarket / Grocery</option>
                  <option>Pharmacy</option>
                  <option>Electronics</option>
                  <option>Fashion / Clothing</option>
                  <option>Restaurant / Food</option>
                  <option>General Retail</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="reg-row">
                <div className="reg-field">
                  <label className="reg-label">Country</label>
                  <select className="reg-select" value={form.country} onChange={set("country")}>
                    <option value="">Select...</option>
                    <option>Ghana</option>
                    <option>Nigeria</option>
                    <option>Kenya</option>
                    <option>South Africa</option>
                    <option>Uganda</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="reg-field">
                  <label className="reg-label">City</label>
                  <input className="reg-input" placeholder="e.g. Accra" value={form.city} onChange={set("city")} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button className="reg-btn" style={{ background: "#f0f0f0", color: "#333" }} onClick={() => setStep(1)}>← Back</button>
                <button className="reg-btn" onClick={() => navigate("/dashboard")}>Create Account →</button>
              </div>
            </>
          )}

          <div className="reg-signin">Already have an account? <a onClick={() => navigate("/dashboard")}>Sign in</a></div>
          <div className="reg-trust">
            <span>🔒 256-bit SSL</span>
            <span>🔐 Encrypted</span>
            <span>✅ No credit card</span>
          </div>
        </div>
      </div>
    </div>
  );
}