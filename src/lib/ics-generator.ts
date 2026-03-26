export function generateICS(params: {
  date: string; // ISO datetime
  providerName: string;
  providerAddress?: string;
  summary?: string;
}): string {
  const start = new Date(params.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GHIN//Got Hurt Injury Network//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${params.summary || `Appointment with ${params.providerName}`}`,
    `LOCATION:${params.providerAddress || ''}`,
    `DESCRIPTION:Appointment with ${params.providerName}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(icsContent: string, filename = 'appointment.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
