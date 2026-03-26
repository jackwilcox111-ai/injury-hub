export function TrustBar() {
  const stats = [
    { value: '500+', label: 'Cases Managed' },
    { value: '50+', label: 'Network Providers' },
    { value: '12', label: 'Specialties' },
    { value: '15+', label: 'Florida Locations' },
  ];

  return (
    <section className="py-3 bg-foreground">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x divide-primary-foreground/10">
          {stats.map((stat, i) => (
            <div key={i} className="text-center py-4 md:py-5">
              <p className="font-mono-data text-2xl md:text-3xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs md:text-sm text-primary-foreground/50 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
