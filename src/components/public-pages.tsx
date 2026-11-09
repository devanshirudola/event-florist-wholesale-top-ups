"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight, ArrowUpRight, Boxes, Check, ChevronRight, ClipboardCheck,
  Flower2, Leaf, LockKeyhole, Mail, Package, ShieldCheck, Sprout, Truck,
} from "lucide-react";
import { loadData, saveData } from "@/services/local-store";
import type { Role } from "@/types";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Enter your password."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid work email."),
  company: z.string().trim().min(2, "Enter your business name."),
  password: z.string().min(8, "Use at least 8 characters."),
  confirmPassword: z.string().min(1, "Confirm your password."),
  terms: z.boolean().refine(Boolean, "Please agree to continue."),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type PublicPageProps = { page: "landing" | "login" | "register" };

function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className="inline-flex items-center gap-2.5">
    <span className={`grid h-10 w-10 place-items-center rounded-xl ${inverse ? "bg-white/10 text-white" : "bg-plum-900 text-white"}`}><Flower2 size={21} strokeWidth={1.7}/></span>
    <span className="leading-tight"><span className={`block font-display text-[16px] font-semibold ${inverse ? "text-white" : "text-plum-900"}`}>Event Florist</span><span className={`mt-1 block text-[9px] font-semibold uppercase tracking-[.18em] ${inverse ? "text-white/50" : "text-stone-400"}`}>Wholesale top-ups</span></span>
  </Link>;
}

function LandingPage() {
  const workflow = [
    { number: "01", title: "Keep your catalog tidy", text: "Know what you stock, who supplies it, and how much to keep on hand.", icon: Package },
    { number: "02", title: "Spot the next top-up", text: "Clear stock alerts show what needs replenishing and the recommended quantity.", icon: Boxes },
    { number: "03", title: "Receive with confidence", text: "Track purchase orders and deliveries without losing sight of inventory.", icon: ClipboardCheck },
  ];

  return <main className="min-h-screen bg-[#fbfaf9] text-stone-800">
    <header className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
      <Brand/>
      <nav className="hidden items-center gap-8 text-[11px] font-medium text-stone-500 md:flex"><a href="#workflow" className="hover:text-plum-700">How it works</a><a href="#workspace" className="hover:text-plum-700">Workspace</a></nav>
      <div className="flex items-center gap-2"><Link href="/login" className="rounded-lg px-3 py-2 text-[11px] font-semibold text-plum-800 hover:bg-plum-50">Log in</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-plum-900 px-3.5 py-2.5 text-[10px] font-semibold text-white transition hover:bg-plum-700">Create account <ArrowRight size={13}/></Link></div>
    </header>

    <section className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
      <div className="relative z-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sage-100 bg-sage-50 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[.14em] text-sage-700"><Sprout size={13}/>Made for event florists</div>
        <h1 className="max-w-[620px] font-display text-[42px] leading-[1.13] tracking-[-.03em] text-plum-900 sm:text-[56px]">A calmer way to keep your studio <span className="text-plum-500">in bloom.</span></h1>
        <p className="mt-5 max-w-[480px] text-[13px] leading-6 text-stone-500">One considered workspace for wholesale supplies, stock levels, supplier orders, and incoming deliveries. Built for the people behind beautiful events.</p>
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-plum-900 px-5 py-3 text-[11px] font-semibold text-white shadow-sm transition hover:bg-plum-700">Get started <ArrowRight size={14}/></Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-5 py-3 text-[11px] font-semibold text-stone-600 transition hover:border-plum-200 hover:text-plum-700">Explore the workspace <ArrowUpRight size={13}/></Link></div>
        <div className="mt-8 flex items-center gap-3 text-[10px] text-stone-400"><span className="flex -space-x-2">{["bg-plum-200", "bg-sage-100", "bg-blush-100"].map((color, index) => <span key={index} className={`grid h-7 w-7 place-items-center rounded-full border-2 border-[#fbfaf9] ${color}`}><Flower2 size={12} className="text-plum-700"/></span>)}</span><span>Thoughtful tools for the work behind the flowers</span></div>
      </div>

      <div className="relative mx-auto w-full max-w-[510px]">
        <div className="absolute -left-7 -top-8 h-28 w-28 rounded-full bg-sage-100/70 blur-2xl"/><div className="absolute -bottom-8 -right-7 h-32 w-32 rounded-full bg-blush-100/80 blur-2xl"/>
        <div className="relative overflow-hidden rounded-[26px] border border-white bg-white p-3 shadow-[0_24px_70px_rgba(53,38,53,.12)]">
          <div className="overflow-hidden rounded-[19px] bg-[#f7f5f3]">
            <div className="flex items-center justify-between border-b border-stone-200/70 bg-white px-5 py-4"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-plum-900 text-white"><Flower2 size={16}/></span><div><p className="text-[10px] font-semibold">Studio inventory</p><p className="mt-0.5 text-[8px] text-stone-400">A quick look at your supplies</p></div></div><span className="rounded-full bg-stone-100 px-2 py-1 text-[8px] font-medium text-stone-500">Sample data</span></div>
            <div className="grid grid-cols-3 gap-2.5 p-4">{[["Stock value", "$4,280"], ["Active items", "42"], ["To replenish", "03"]].map(([label, amount]) => <div key={label} className="rounded-xl border border-stone-100 bg-white p-3"><p className="text-[8px] text-stone-400">{label}</p><p className="mt-2 text-[14px] font-semibold text-plum-900">{amount}</p></div>)}</div>
            <div className="mx-4 rounded-xl border border-stone-100 bg-white p-4">
              <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold">Stock overview</p><p className="mt-1 text-[8px] text-stone-400">Your staples, at a glance</p></div><span className="rounded-full bg-sage-50 px-2 py-1 text-[8px] font-medium text-sage-700">This month</span></div>
              <div className="flex h-[118px] items-end gap-2 border-b border-stone-100 px-2">{[38, 53, 46, 69, 58, 84, 74, 94, 72, 88, 66, 79].map((height, index) => <span key={index} style={{ height: `${height}%` }} className={`flex-1 rounded-t-sm ${index === 7 ? "bg-plum-500" : "bg-plum-100"}`} />)}</div>
              <div className="mt-2 flex justify-between px-1 text-[8px] text-stone-400"><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div>
            </div>
            <div className="mx-4 mb-4 mt-3 rounded-xl border border-stone-100 bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold">Needs a top-up</p><span className="text-[8px] font-medium text-plum-700">View all</span></div>{[["Wet floral foam bricks", "6 on hand", "bg-sage-100"], ["Clear water picks", "3 on hand", "bg-blush-100"]].map(([name, count, color]) => <div key={name} className="mt-2 flex items-center gap-2.5"><span className={`grid h-8 w-8 place-items-center rounded-lg ${color}`}><Leaf size={14} className="text-sage-700"/></span><span className="flex-1 text-[9px] font-medium">{name}</span><span className="text-[8px] text-stone-400">{count}</span></div>)}</div>
          </div>
        </div>
        <div className="absolute -right-4 top-[38%] hidden rounded-xl border border-stone-100 bg-white p-3 shadow-lg sm:block"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-sage-50 text-sage-700"><Check size={14}/></span><div><p className="text-[9px] font-semibold">Delivery received</p><p className="mt-1 text-[8px] text-stone-400">Inventory is up to date</p></div></div></div>
      </div>
    </section>

    <section id="workspace" className="border-y border-stone-200/70 bg-white py-7"><div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 text-[10px] font-medium text-stone-400 sm:px-8"><span>ONE WORKSPACE FOR YOUR WHOLESALE FLOW</span><span className="flex items-center gap-2"><Package size={14} className="text-plum-500"/>Product catalog</span><span className="flex items-center gap-2"><Boxes size={14} className="text-sage-600"/>Inventory visibility</span><span className="flex items-center gap-2"><Truck size={14} className="text-blush-600"/>Supplier orders</span><span className="flex items-center gap-2"><ClipboardCheck size={14} className="text-plum-500"/>Goods receiving</span></div></section>

    <section id="workflow" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="max-w-[560px]"><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-plum-500">A better rhythm for replenishment</p><h2 className="mt-3 font-display text-3xl leading-tight text-plum-900 sm:text-[38px]">The practical details, thoughtfully in one place.</h2><p className="mt-3 text-[11px] leading-5 text-stone-500">Less time chasing stock information. More confidence that the right materials will be ready for the next event.</p></div>
      <div className="mt-9 grid gap-3 md:grid-cols-3">{workflow.map((item) => <article key={item.number} className="rounded-2xl border border-stone-200/80 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-card"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold tracking-widest text-plum-400">{item.number}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-plum-50 text-plum-700"><item.icon size={17}/></span></div><h3 className="mt-5 text-[13px] font-semibold text-stone-800">{item.title}</h3><p className="mt-2 text-[10px] leading-5 text-stone-500">{item.text}</p></article>)}</div>
    </section>

    <section className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 sm:pb-20"><div className="relative overflow-hidden rounded-2xl bg-plum-900 px-6 py-8 text-white sm:px-10 sm:py-10"><div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10"/><div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-plum-200">Ready when you are</p><h2 className="mt-2 font-display text-2xl sm:text-3xl">Bring a little more ease to your next top-up.</h2></div><Link href="/register" className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-3 text-[10px] font-semibold text-plum-900 hover:bg-plum-50">Create your workspace <ArrowRight size={13}/></Link></div></div></section>
    <footer className="border-t border-stone-200/70 px-5 py-5 text-center text-[9px] text-stone-400">Event Florist Wholesale Top-Ups <span className="mx-2">·</span> An internal operations workspace</footer>
  </main>;
}

function AuthPage({ page }: { page: "login" | "register" }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const isRegister = page === "register";
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", company: "", password: "", confirmPassword: "", terms: false } });

  const finishSignIn = (email: string, name: string, role: Role, company?: string) => {
    try {
      window.localStorage.setItem("event-florist-prototype-role", role);
      window.localStorage.setItem("event-florist-current-user", JSON.stringify({ name, email, company: company || "" }));
    } catch {
      // Storage may be blocked (private browsing); the demo still opens.
    }
    setNotice("Opening your local demo workspace…");
    window.setTimeout(() => router.push("/dashboard"), 300);
  };

  const submitLogin = loginForm.handleSubmit((values) => {
    const user = loadData().users.find((item) => item.email.toLowerCase() === values.email.toLowerCase());
    finishSignIn(values.email, user?.name || "Olivia Bennett", user?.role || "Staff");
  });

  const submitRegister = registerForm.handleSubmit((values) => {
    const data = loadData();
    if (data.users.some((user) => user.email.toLowerCase() === values.email.toLowerCase())) {
      registerForm.setError("email", { message: "This email already has a local profile. Try logging in." });
      return;
    }
    const user = { id: `u${Date.now()}`, name: values.name, email: values.email, role: "Staff" as const };
    saveData({ ...data, users: [user, ...data.users] });
    finishSignIn(user.email, user.name, user.role, values.company);
  });

  const loginErrors = loginForm.formState.errors;
  const registerErrors = registerForm.formState.errors;

  return <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(380px,.82fr)]">
    <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
      <div className="flex items-center justify-between"><Brand/><Link href="/" className="text-[10px] font-medium text-stone-400 hover:text-plum-700">Back to home</Link></div>
      <div className="mx-auto flex w-full max-w-[410px] flex-1 flex-col justify-center py-10">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl bg-plum-50 text-plum-700"><LockKeyhole size={19}/></div>
        <p className="text-[9px] font-semibold uppercase tracking-[.16em] text-plum-500">{isRegister ? "A more considered workflow" : "Your wholesale workspace"}</p>
        <h1 className="mt-2 font-display text-[30px] leading-tight text-plum-900">{isRegister ? "Create your workspace" : "Welcome back"}</h1>
        <p className="mt-2 text-[11px] leading-5 text-stone-500">{isRegister ? "Set up a local demo profile to explore the Event Florist workspace." : "Sign in to pick up where your studio left off."}</p>
        <div className="mt-7 rounded-xl border border-plum-100 bg-plum-50/70 p-3 text-[9px] leading-4 text-plum-700"><ShieldCheck size={14} className="mr-1.5 inline align-[-3px]"/>{isRegister ? "Demo profile only. Your password is never saved or sent anywhere." : "Frontend prototype only. Any valid email and non-empty password will open the demo."}</div>

        {isRegister ? <form onSubmit={submitRegister} className="mt-5 space-y-3" noValidate>
          <Field label="Full name" error={registerErrors.name?.message}><input {...registerForm.register("name")} autoComplete="name" placeholder="Your name" className="auth-field"/></Field>
          <Field label="Work email" error={registerErrors.email?.message}><input {...registerForm.register("email")} type="email" autoComplete="email" placeholder="you@studio.com" className="auth-field"/></Field>
          <Field label="Business name" error={registerErrors.company?.message}><input {...registerForm.register("company")} autoComplete="organization" placeholder="Your floral studio" className="auth-field"/></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Password" error={registerErrors.password?.message}><input {...registerForm.register("password")} type="password" autoComplete="new-password" placeholder="At least 8 characters" className="auth-field"/></Field><Field label="Confirm password" error={registerErrors.confirmPassword?.message}><input {...registerForm.register("confirmPassword")} type="password" autoComplete="new-password" placeholder="Re-enter password" className="auth-field"/></Field></div>
          <label className="flex items-start gap-2 pt-1 text-[9px] leading-4 text-stone-500"><input type="checkbox" {...registerForm.register("terms")} className="mt-0.5 accent-[#39263e]"/>I understand this is a local frontend demo, not an authenticated account.</label>
          {registerErrors.terms && <p className="text-[9px] text-red-600">{registerErrors.terms.message}</p>}
          <button type="submit" className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-plum-900 text-[10px] font-semibold text-white transition hover:bg-plum-700">Create demo account <ArrowRight size={14}/></button>
        </form> : <form onSubmit={submitLogin} className="mt-5 space-y-3" noValidate>
          <Field label="Work email" error={loginErrors.email?.message}><div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input {...loginForm.register("email")} type="email" autoComplete="email" placeholder="you@studio.com" className="auth-field pl-9"/></div></Field>
          <Field label="Password" error={loginErrors.password?.message}><input {...loginForm.register("password")} type="password" autoComplete="current-password" placeholder="Enter any password for this demo" className="auth-field"/></Field>
          <div className="flex justify-end"><button type="button" onClick={() => setNotice("Password recovery is not available in this frontend-only prototype.")} className="text-[9px] font-medium text-plum-700 hover:underline">Forgot password?</button></div>
          <button type="submit" className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-plum-900 text-[10px] font-semibold text-white transition hover:bg-plum-700">Log in to workspace <ArrowRight size={14}/></button>
        </form>}

        {notice && <p role="status" className="mt-3 rounded-lg bg-sage-50 px-3 py-2 text-[9px] text-sage-700">{notice}</p>}
        <p className="mt-5 text-center text-[10px] text-stone-500">{isRegister ? "Already have a workspace?" : "New to Event Florist?"} <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-plum-700 hover:underline">{isRegister ? "Log in" : "Create an account"}</Link></p>
      </div>
      <div className="flex items-center justify-between gap-2 text-[8px] text-stone-400"><span>© 2026 Event Florist</span><span>Local browser prototype · No backend connected</span></div>
    </section>

    <aside className="relative hidden overflow-hidden bg-plum-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_15%,rgba(190,157,191,.22),transparent_42%),radial-gradient(ellipse_at_15%_90%,rgba(137,160,127,.13),transparent_40%)]"/>
      <div className="absolute right-[-170px] top-[15%] h-[470px] w-[470px] rounded-full border border-white/[.08]"/><div className="absolute right-[-100px] top-[23%] h-[330px] w-[330px] rounded-full border border-white/[.08]"/>
      <div className="relative"><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-plum-200">Thoughtfully in season</p><h2 className="mt-4 max-w-[460px] font-display text-[38px] leading-[1.18]">Make room for the work that matters.</h2><p className="mt-4 max-w-[390px] text-[11px] leading-5 text-white/60">A little more clarity for every stem, spool, supplier, and delivery that brings an event together.</p></div>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur-sm"><div className="mb-4 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/50"><Sprout size={14}/>A smoother replenishment flow</div><div className="space-y-3">{[{ icon: Package, text: "Know what’s on the shelf", color: "text-[#c7b1cc]" }, { icon: Truck, text: "Stay close to supplier orders", color: "text-[#b5c5a9]" }, { icon: Check, text: "Receive with a clear record", color: "text-[#e7b9b3]" }].map((item) => <div key={item.text} className="flex items-center gap-3 text-[10px] text-white/80"><span className={`grid h-8 w-8 place-items-center rounded-lg bg-white/[.07] ${item.color}`}><item.icon size={15}/></span>{item.text}<ChevronRight size={13} className="ml-auto text-white/30"/></div>)}</div></div>
      <p className="relative text-[9px] text-white/35">Designed for the teams who make celebrations feel effortless.</p>
    </aside>
  </main>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[9px] font-semibold text-stone-600">{label}</span>{children}{error && <span className="mt-1 block text-[9px] text-red-600">{error}</span>}</label>;
}

export default function PublicPages({ page }: PublicPageProps) {
  if (page === "landing") return <LandingPage/>;
  return <AuthPage page={page}/>;
}
