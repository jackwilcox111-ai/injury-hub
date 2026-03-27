import missionBg from '@/assets/mission-bg.jpg';

export function MissionBanner() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={missionBg}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          width={1920}
          height={768}
        />
        <div className="absolute inset-0 bg-foreground/50" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/20" />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="w-12 h-px bg-primary mx-auto mb-8" />
        <p className="text-2xl md:text-3xl lg:text-[34px] font-display font-bold text-primary-foreground leading-snug">
          We partner with attorneys and providers to streamline quality patient care at a great value — enabling patients to maximize their personal injury settlements.
        </p>
        <div className="w-12 h-px bg-primary mx-auto mt-8" />
      </div>
    </section>
  );
}
