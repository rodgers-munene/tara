"use client";

import { useState } from "react";
import {
  Menu,
  X,
  ChevronDown,
  Home,
  ShoppingBag,
  Users,
  BarChart,
  Layers,
  UserPlus,
  UserCheck,
  Gift,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Shield,
  Zap,
  Truck,
  User,
  Briefcase,
  Package,
  DollarSign,
  Settings,
  TrendingUp,
  Award,
  Globe,
  HelpCircle,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  const faqItems = [
    {
      q: "What is Tara POS?",
      a: "Tara is a modern point-of-sale platform designed to help businesses manage sales, staff, and daily operations — all in one simple, connected system.",
    },
    {
      q: "Who can use Tara?",
      a: "Tara is built for business owners, shop managers, retail staff, field agents, and team leaders. Whether you run a supermarket, a small boutique, or a team of agents, Tara adapts to your needs.",
    },
    {
      q: "Can Tara help me manage my shop?",
      a: "Yes. Tara lets you organise your shop information, track sales, manage products, and oversee staff — all from one dashboard.",
    },
    {
      q: "What are Tara agents?",
      a: "Tara agents are field representatives who help onboard new businesses onto the platform. They capture business details and set up accounts, making it easy for businesses to get started.",
    },
    {
      q: "Can agents work in teams?",
      a: "Absolutely. Tara supports team‑based field operations. Team leaders can coordinate agents, assign tasks, and track onboarded businesses together.",
    },
    {
      q: "How do I get started?",
      a: "Click 'Get Started' on this page to create your account. If you're a business owner, you'll be guided through setup. If you're an agent, you can join the network and begin onboarding businesses.",
    },
    {
      q: "Do I need technical knowledge?",
      a: "Not at all. Tara is designed to be intuitive and easy to use. No technical background is required — we focus on simplicity so you can focus on your business.",
    },
    {
      q: "How do I sign in?",
      a: "Use the 'Sign In' link in the navigation or at the bottom of the page. Owners sign in at /owner/login, and staff members use the staff login at /login.",
    },
  ];

  return (
    <>
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Tara" className="h-8 w-8 rounded-lg" />
            <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
              TARA
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" style={{ color: "var(--text-2)" }}>
            <a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a>
            <a href="#features" className="hover:text-text transition-colors">Features</a>
            <a href="#for-businesses" className="hover:text-text transition-colors">For Businesses</a>
            <a href="#for-agents" className="hover:text-text transition-colors">For Agents</a>
            <a href="#faq" className="hover:text-text transition-colors">FAQ</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <a
              href="/owner/login"
              className="rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-2"
              style={{ color: "var(--text-2)" }}
            >
              Sign In
            </a>
            <a
              href="/owner/signup"
              className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
              style={{ background: "var(--brand)" }}
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="absolute left-0 top-16 w-full border-b border-border bg-surface p-4 shadow-lg md:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium" style={{ color: "var(--text-2)" }}>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#for-businesses" onClick={() => setMobileMenuOpen(false)}>For Businesses</a>
              <a href="#for-agents" onClick={() => setMobileMenuOpen(false)}>For Agents</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
              <hr className="border-border" />
              <a
                href="/owner/login"
                className="rounded-xl px-4 py-2 text-center transition-colors hover:bg-surface-2"
                style={{ color: "var(--text-2)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </a>
              <a
                href="/owner/signup"
                className="rounded-xl px-5 py-2 text-center font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: "var(--brand)" }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 py-12 md:py-20 lg:py-28">
          <div className="container mx-auto max-w-7xl">
            <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
              <div className="text-center md:text-left">
                <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl" style={{ color: "var(--text)" }}>
                  Run Your Business <br className="hidden sm:inline" />
                  <span style={{ color: "var(--brand)" }}>Smarter</span> with Tara POS
                </h1>
                <p className="mt-4 text-lg" style={{ color: "var(--text-2)" }}>
                  A simple, powerful point‑of‑sale platform that connects your business, staff,
                  sales, and operations in one place.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                  <a
                    href="/owner/signup"
                    className="rounded-xl px-6 py-3 font-semibold text-white transition-colors hover:opacity-90"
                    style={{ background: "var(--brand)" }}
                  >
                    Get Started
                  </a>
                  <a
                    href="/owner/login"
                    className="rounded-xl px-6 py-3 font-medium transition-colors hover:bg-surface-2"
                    style={{ color: "var(--text-2)" }}
                  >
                    Sign In
                  </a>
                  <a href="#how-it-works" className="rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-2" style={{ color: "var(--text-3)" }}>
                    Learn How Tara Works →
                  </a>
                </div>
              </div>

              {/* Dashboard mockup */}
              <div className="relative flex justify-center">
                <div
                  className="w-full max-w-md rounded-2xl border p-4 shadow-xl"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-brand/20 flex items-center justify-center">
                        <span className="text-xs font-bold" style={{ color: "var(--brand)" }}>T</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Tara POS</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                      <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                      <div className="h-2 w-2 rounded-full bg-red-400"></div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>Today</span>
                      <p className="text-lg font-bold" style={{ color: "var(--text)" }}>$1,240</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>Transactions</span>
                      <p className="text-lg font-bold" style={{ color: "var(--text)" }}>47</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center" style={{ borderColor: "var(--border)" }}>
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>Staff</span>
                      <p className="text-lg font-bold" style={{ color: "var(--text)" }}>8</p>
                    </div>
                  </div>

                  <div className="mt-4 h-24 w-full rounded-lg border" style={{ borderColor: "var(--border)" }}>
                    <div className="flex h-full items-end justify-around px-2 pb-1">
                      <div className="w-6 rounded-t-md bg-brand/30" style={{ height: "40%" }}></div>
                      <div className="w-6 rounded-t-md bg-brand/50" style={{ height: "70%" }}></div>
                      <div className="w-6 rounded-t-md bg-brand/70" style={{ height: "55%" }}></div>
                      <div className="w-6 rounded-t-md bg-brand" style={{ height: "90%" }}></div>
                      <div className="w-6 rounded-t-md bg-brand/40" style={{ height: "30%" }}></div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Products</span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>Recent Activity</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs" style={{ color: "var(--text-3)" }}>
                    <span>12 items</span>
                    <span>3 new orders</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What Is Tara */}
        <section id="features" className="px-4 py-16 md:py-20" style={{ background: "var(--surface-2)" }}>
          <div className="container mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
                One Platform. <span style={{ color: "var(--brand)" }}>Your Entire Business.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl" style={{ color: "var(--text-2)" }}>
                Tara brings together the essential parts of your business operations in one simple, connected system.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: ShoppingBag, title: "POS", desc: "Process and manage everyday sales efficiently." },
                { icon: Layers, title: "Business Management", desc: "Keep your shop information and operations organized." },
                { icon: Users, title: "Staff", desc: "Manage the people who work with your business." },
                { icon: BarChart, title: "Insights", desc: "Understand business activity and performance at a glance." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--brand-light)" }}>
                    <item.icon size={24} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold" style={{ color: "var(--text)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How Tara Works */}
        <section id="how-it-works" className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
              How Tara Works
            </h2>
            <div className="relative mt-12 flex flex-col gap-8 md:flex-row md:justify-between">
              {/* Vertical line for desktop */}
              <div className="absolute left-1/2 top-8 hidden h-full w-0.5 -translate-x-1/2 md:block" style={{ background: "var(--border)" }}></div>

              {[
                { step: 1, title: "Join Tara", desc: "Create your account or get onboarded by a Tara agent." },
                { step: 2, title: "Set Up Your Business", desc: "Add business details, location, staff, and more." },
                { step: 3, title: "Start Using Tara POS", desc: "Process transactions and manage daily sales." },
                { step: 4, title: "Manage Your Team", desc: "Control staff access and business operations." },
                { step: 5, title: "Grow With Insights", desc: "Monitor activity and make smarter decisions." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative flex flex-1 flex-col items-center text-center"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: "var(--brand)" }}
                  >
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--text)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* POS Experience */}
        <section className="px-4 py-16 md:py-20" style={{ background: "var(--surface-2)" }}>
          <div className="container mx-auto max-w-7xl">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
                  A POS Built for <span style={{ color: "var(--brand)" }}>Real Businesses</span>
                </h2>
                <p className="mt-3 text-lg" style={{ color: "var(--text-2)" }}>
                  Fast transactions. Simple workflows. Better records.
                </p>
                <ul className="mt-6 space-y-3">
                  {["Product search & categories", "Shopping cart with quantity controls", "Subtotal, total, and payment buttons", "Recent transactions & receipt preview"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle size={20} style={{ color: "var(--brand)" }} />
                      <span style={{ color: "var(--text-2)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-center">
                <div
                  className="w-full max-w-sm rounded-2xl border p-4 shadow-xl"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                    <span className="text-sm font-bold" style={{ color: "var(--text)" }}>New Sale</span>
                    <span className="text-xs" style={{ color: "var(--text-3)" }}>#1024</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--text-2)" }}>Organic Apples</span>
                      <span style={{ color: "var(--text)" }}>$4.50</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--text-2)" }}>Bread</span>
                      <span style={{ color: "var(--text)" }}>$2.00</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--text-2)" }}>Milk (1L)</span>
                      <span style={{ color: "var(--text)" }}>$3.20</span>
                    </div>
                  </div>
                  <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span style={{ color: "var(--text)" }}>Subtotal</span>
                      <span style={{ color: "var(--text)" }}>$9.70</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span style={{ color: "var(--text)" }}>Total</span>
                      <span style={{ color: "var(--text)" }}>$9.70</span>
                    </div>
                    <button
                      className="mt-4 w-full rounded-xl py-3 font-semibold text-white transition-colors hover:opacity-90"
                      style={{ background: "var(--brand)" }}
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business Owner Benefits */}
        <section id="for-businesses" className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
                Everything Your Business Needs, <span style={{ color: "var(--brand)" }}>In One Place</span>
              </h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Home, title: "Manage Your Shop", desc: "Keep your business information organised." },
                { icon: Users, title: "Manage Staff", desc: "Control who can access and work within your business." },
                { icon: DollarSign, title: "Track Sales", desc: "Keep a clear record of transactions and activity." },
                { icon: Package, title: "Stay Organized", desc: "Bring daily operations into one platform." },
                { icon: Smartphone, title: "Access Anywhere", desc: "Use Tara from supported devices without complicated setup." },
                { icon: TrendingUp, title: "Built for Growth", desc: "Start simple and expand as your business grows." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--brand-light)" }}>
                    <item.icon size={20} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3 className="mt-4 font-semibold" style={{ color: "var(--text)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <a
                href="/owner/signup"
                className="inline-block rounded-xl px-8 py-3 font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                Start Using Tara
              </a>
            </div>
          </div>
        </section>

        {/* Tara Agent Ecosystem */}
        <section id="for-agents" className="px-4 py-16 md:py-20" style={{ background: "var(--surface-2)" }}>
          <div className="container mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
                Tara Agents Power <span style={{ color: "var(--brand)" }}>Business Onboarding</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl" style={{ color: "var(--text-2)" }}>
                Tara agents work on the ground to help bring businesses onto the platform. They register businesses,
                capture details, and support the onboarding network.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <UserPlus size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Register Businesses</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>Collect and submit business information.</p>
              </div>
              <div className="rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <Briefcase size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Work in Teams</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>Collaborate with team leaders and other agents.</p>
              </div>
              <div className="rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <Award size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Track Your Impact</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>See businesses you've registered and contribute to growth.</p>
              </div>
            </div>

            <div className="mt-10 text-center">
              <a
                href="/owner/signup"
                className="inline-block rounded-xl px-8 py-3 font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                Become a Tara Agent
              </a>
            </div>
          </div>
        </section>

        {/* Team-Based Agent System */}
        <section className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
                Work Better <span style={{ color: "var(--brand)" }}>as a Team</span>
              </h2>
              <p className="mx-auto mt-3 max-w-2xl" style={{ color: "var(--text-2)" }}>
                Tara supports team‑based field operations. Team leaders can coordinate agents,
                assign tasks, and manage business registrations together.
              </p>
            </div>

            <div className="mt-12 flex flex-col items-center gap-6 md:flex-row md:justify-center">
              <div className="w-full max-w-xs rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <User size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Team Leader</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>Create teams, add members, coordinate operations.</p>
              </div>
              <div className="text-3xl text-text-3 hidden md:block">→</div>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="w-full max-w-xs rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <Users size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                  <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Agents</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>Register businesses, submit details, work under the team.</p>
                </div>
              </div>
              <div className="text-3xl text-text-3 hidden md:block">→</div>
              <div className="w-full max-w-xs rounded-2xl border p-6 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <Building2 size={40} style={{ color: "var(--brand)" }} className="mx-auto" />
                <h3 className="mt-3 font-semibold" style={{ color: "var(--text)" }}>Businesses</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>Onboarded and supported by the team network.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Designed for Different Users */}
        <section className="px-4 py-16 md:py-20" style={{ background: "var(--surface-2)" }}>
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
              Designed for <span style={{ color: "var(--brand)" }}>Different Users</span>
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Home, title: "Business Owners", desc: "Manage your shop and operations.", link: "/owner/signup", label: "For Business Owners" },
                { icon: UserCheck, title: "Staff", desc: "Work with the business through authorized access.", link: "/login", label: "For Staff" },
                { icon: UserPlus, title: "Tara Agents", desc: "Register and support businesses in the field.", link: "/owner/signup", label: "For Agents" },
                { icon: Users, title: "Team Leaders", desc: "Build and coordinate your agent team.", link: "/owner/signup", label: "For Team Leaders" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--brand-light)" }}>
                    <item.icon size={24} style={{ color: "var(--brand)" }} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold" style={{ color: "var(--text)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>{item.desc}</p>
                  <a
                    href={item.link}
                    className="mt-4 inline-block text-sm font-medium transition-colors hover:opacity-80"
                    style={{ color: "var(--brand)" }}
                  >
                    {item.label} →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Tara */}
        <section className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-center text-3xl font-bold md:text-4xl" style={{ color: "var(--text)" }}>
              Why Businesses <span style={{ color: "var(--brand)" }}>Choose Tara</span>
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Zap, title: "Simple to Use", desc: "No complexity — just a clean, intuitive interface." },
                { icon: Layers, title: "Centralized Information", desc: "All your business data in one place." },
                { icon: Truck, title: "Faster Operations", desc: "Speed up daily sales and staff management." },
                { icon: BarChart, title: "Better Visibility", desc: "Understand your business activity instantly." },
                { icon: Users, title: "Staff Management", desc: "Control access and permissions with ease." },
                { icon: Globe, title: "Agent‑Supported", desc: "Onboarding and support from Tara's field network." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={24} style={{ color: "var(--brand)" }} />
                    <h3 className="font-semibold" style={{ color: "var(--text)" }}>{item.title}</h3>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Trust */}
        <section className="px-4 py-16 md:py-20" style={{ background: "var(--surface-2)" }}>
          <div className="container mx-auto max-w-7xl text-center">
            <Shield size={48} style={{ color: "var(--brand)" }} className="mx-auto" />
            <h2 className="mt-4 text-3xl font-bold" style={{ color: "var(--text)" }}>
              Your Business Information Matters
            </h2>
            <p className="mx-auto mt-3 max-w-2xl" style={{ color: "var(--text-2)" }}>
              We take data protection seriously. Tara uses authenticated access, account‑based permissions,
              and secure login to keep your business information safe.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-8">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} style={{ color: "var(--brand)" }} />
                <span style={{ color: "var(--text-2)" }}>Authenticated access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} style={{ color: "var(--brand)" }} />
                <span style={{ color: "var(--text-2)" }}>Controlled staff permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} style={{ color: "var(--brand)" }} />
                <span style={{ color: "var(--text-2)" }}>Secure login</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold" style={{ color: "var(--text)" }}>
              Frequently Asked Questions
            </h2>
            <div className="mt-8 space-y-3">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border transition-all"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left font-medium transition-colors hover:bg-surface-2"
                    style={{ color: "var(--text)" }}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-200 ${faqOpen === index ? "rotate-180" : ""}`}
                      style={{ color: "var(--text-3)" }}
                    />
                  </button>
                  {faqOpen === index && (
                    <div className="px-6 pb-5 text-sm" style={{ color: "var(--text-2)" }}>
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 md:py-24" style={{ background: "var(--brand)" }}>
          <div className="container mx-auto max-w-3xl text-center text-white">
            <h2 className="text-3xl font-bold md:text-4xl">
              Ready to Take Your Business <br className="hidden sm:inline" />to the Next Level?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Join Tara and bring your business operations together in one simple platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href="/owner/signup"
                className="rounded-xl bg-white px-8 py-3 font-semibold text-brand transition-colors hover:bg-white/90"
                style={{ color: "var(--brand)" }}
              >
                Get Started
              </a>
              <a
                href="/owner/login"
                className="rounded-xl border border-white/30 px-8 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Sign In
              </a>
              <a
                href="/owner/signup"
                className="rounded-xl border border-white/30 px-8 py-3 font-medium text-white transition-colors hover:bg-white/10"
              >
                Become a Tara Agent
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="container mx-auto max-w-7xl px-4 py-12 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <img src="/icon-192.png" alt="Tara" className="h-8 w-8 rounded-lg" />
                <span className="text-xl font-bold" style={{ color: "var(--text)" }}>TARA</span>
              </div>
              <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
                Tara POS — powering smarter business operations.
              </p>
            </div>

            <div>
              <h4 className="font-semibold" style={{ color: "var(--text)" }}>Navigate</h4>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-2)" }}>
                <li><a href="#" className="hover:text-text transition-colors">Home</a></li>
                <li><a href="#features" className="hover:text-text transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-text transition-colors">How It Works</a></li>
                <li><a href="#for-businesses" className="hover:text-text transition-colors">For Businesses</a></li>
                <li><a href="#for-agents" className="hover:text-text transition-colors">For Agents</a></li>
                <li><a href="#faq" className="hover:text-text transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold" style={{ color: "var(--text)" }}>Account</h4>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-2)" }}>
                <li><a href="/owner/login" className="hover:text-text transition-colors">Sign In</a></li>
                <li><a href="/owner/signup" className="hover:text-text transition-colors">Create Account</a></li>
                <li><a href="/login" className="hover:text-text transition-colors">Staff Login</a></li>
                <li><a href="/owner/signup" className="hover:text-text transition-colors">Agent Sign Up</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold" style={{ color: "var(--text)" }}>Legal</h4>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--text-2)" }}>
                <li><a href="#" className="hover:text-text transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-text transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-6 text-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-3)" }}>
            © 2026 Tara. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
