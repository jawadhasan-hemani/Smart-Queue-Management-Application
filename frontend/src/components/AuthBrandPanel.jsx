import React from 'react';
import { Users, Clock, Zap, ShieldCheck, Building2 } from 'lucide-react';

const defaultFeatures = [
  { Icon: Clock, text: 'Live queue position' },
  { Icon: Zap, text: 'Instant notifications' },
  { Icon: ShieldCheck, text: 'No more guessing' },
];

/**
 * Shared left-side brand panel used across all auth screens
 * (Landing/Login/Register, Forgot Password, etc.) so they stay visually consistent.
 * Styled to match the AppShell sidebar (dark tone, sidebar-* design tokens).
 */
export function AuthBrandPanel({
  heading = 'Know where you stand in line.',
  subtitle = 'Live position, wait times, and updates — all in one place.',
  features = defaultFeatures,
}) {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden bg-sidebar border-b lg:border-b-0 lg:border-r border-sidebar-border px-8 py-10 text-sidebar-foreground lg:w-2/5 lg:px-14 lg:py-14">
      {/* Top bar with logo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Users className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tighter">QueueSmart</span>
        </div>
      </div>

      {/* Central brand statement */}
      <div className="my-12 max-w-md lg:my-auto">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-sidebar-accent px-3 py-1 text-xs font-bold text-sidebar-accent-foreground">
          <Building2 className="size-3.5 text-sidebar-primary" />
          University Advising Offices
        </p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight lg:text-4xl">
          {heading}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/70">
          {subtitle}
        </p>

        <ul className="mt-8 space-y-4 text-sm font-medium">
          {features.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-primary">
                <Icon className="size-4" />
              </span>
              <span className="text-sidebar-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="hidden text-xs text-sidebar-foreground/60 lg:block">
        &copy; 2026 QueueSmart · University Advising Services
      </p>
    </section>
  );
}