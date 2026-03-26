export function MissionBanner() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.03]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/15 blur-[100px]" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="w-12 h-px bg-primary mx-auto mb-8" />
        <p className="text-2xl md:text-3xl lg:text-[34px] font-display font-bold text-foreground leading-snug">
          We partner with attorneys and providers to streamline quality patient care at a great value — enabling patients to maximize their personal injury settlements.
        </p>
        <div className="w-12 h-px bg-primary mx-auto mt-8" />
      </div>
    </section>
  );
}
