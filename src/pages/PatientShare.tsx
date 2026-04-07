import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Share2, Facebook, Twitter, Linkedin, Link, MessageCircle, Mail, Copy, Check } from 'lucide-react';

const SHARE_URL = 'https://injury-hub.lovable.app';
const SHARE_TITLE = 'Got Hurt Injury Network';
const SHARE_TEXT = "If you or someone you know has been injured, Got Hurt Injury Network connects you with medical providers and legal support — all at no upfront cost. Check it out!";

const SHARE_CHANNELS = [
  {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-[#1877F2] hover:bg-[#166FE5]',
    url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}&quote=${encodeURIComponent(SHARE_TEXT)}`,
  },
  {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-[#000000] hover:bg-[#1a1a1a]',
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
  },
  {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2] hover:bg-[#0958a8]',
    url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
  },
  {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-[#25D366] hover:bg-[#20bd5a]',
    url: `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`,
  },
  {
    name: 'Email',
    icon: Mail,
    color: 'bg-muted-foreground hover:bg-muted-foreground/80',
    url: `mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(SHARE_TEXT + '\n\n' + SHARE_URL)}`,
  },
  {
    name: 'Text Message',
    icon: MessageCircle,
    color: 'bg-primary hover:bg-primary/90',
    url: `sms:?body=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`,
  },
];

export default function PatientShare() {
  const [copied, setCopied] = useState(false);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: SHARE_TITLE,
          text: SHARE_TEXT,
          url: SHARE_URL,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Share2 className="w-6 h-6 text-primary" /> Share Us
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Help others get the care they deserve. Share Got Hurt Injury Network with your friends and family.
        </p>
      </div>

      {/* Native share (mobile) */}
      {'share' in navigator && (
        <Button onClick={handleNativeShare} className="w-full text-base py-6" size="lg">
          <Share2 className="w-5 h-5 mr-2" /> Share Now
        </Button>
      )}

      {/* Social share buttons */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Share on Social Media</h3>
        <div className="grid grid-cols-2 gap-3">
          {SHARE_CHANNELS.map(channel => (
            <a
              key={channel.name}
              href={channel.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors ${channel.color}`}
            >
              <channel.icon className="w-5 h-5 shrink-0" />
              {channel.name}
            </a>
          ))}
        </div>
      </div>

      {/* Copy link */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Or Copy the Link</h3>
        <div className="flex gap-2">
          <div className="flex-1 bg-accent rounded-lg px-4 py-2.5 text-sm text-foreground font-mono truncate">
            {SHARE_URL}
          </div>
          <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Message */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 text-center">
        <p className="text-sm text-foreground font-medium">Thank you for spreading the word! 💚</p>
        <p className="text-xs text-muted-foreground mt-1">
          Every share helps someone get the medical care and legal support they need.
        </p>
      </div>
    </div>
  );
}
