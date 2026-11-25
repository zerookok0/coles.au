import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '../state/index.jsx';

export function Login() {
  const { login } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = login({ email, password });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    pushToast('Signed in successfully.', { href: '/account', label: 'My account' });
    setTimeout(() => navigate('/account'), 450);
  }

  return (
    <div className="container authpage">
      <div className="authcard">
        <h1>Sign in</h1>
        <p className="authsub">Welcome back. Sign in to see your cart, orders and Flybuys points.</p>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="formerror">{error}</p> : null}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="authalt">
          New to Coles Online? <Link to="/account/register">Create an account</Link>
        </p>
      </div>

      <div className="authside">
        <h2>Why shop online with us</h2>
        <ul>
          <li><b>Free delivery</b> on orders over $50</li>
          <li><b>Same-day delivery</b> when you order before 2pm</li>
          <li><b>Free Click &amp; Collect</b> ready in two hours</li>
          <li><b>1,000+ weekly specials</b> across the store</li>
        </ul>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    const result = register(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    pushToast('Account created — you are signed in.', { href: '/account', label: 'My account' });
    setTimeout(() => navigate('/account'), 450);
  }

  return (
    <div className="container authpage">
      <div className="authcard">
        <h1>Create your account</h1>
        <p className="authsub">One account for delivery, Click &amp; Collect and Flybuys.</p>

        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Full name</span>
            <input value={form.name} onChange={set('name')} placeholder="Your full name" autoComplete="name" required />
          </label>

          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@email.com"
              autoComplete="email"
              required
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          {error ? <p className="formerror">{error}</p> : null}

          <button type="submit" className="btn btn-primary btn-block btn-lg">Create account</button>
        </form>

        <p className="authalt">
          Already have an account? <Link to="/account/login">Sign in</Link>
        </p>
      </div>

      <div className="authside">
        <h2>New shopper offer</h2>
        <p className="authoffer">Free delivery on your first three orders over $50.</p>
        <ul>
          <li>Track every order in one place</li>
          <li>Save your delivery address and store</li>
          <li>Collect Flybuys points online</li>
        </ul>
      </div>
    </div>
  );
}
