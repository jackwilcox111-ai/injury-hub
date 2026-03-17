import { ProviderMessagesTab } from '@/components/provider/ProviderMessagesTab';

export default function ProviderMessages() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl">Messages</h2>
        <p className="text-sm text-muted-foreground">Updates from your care coordination team.</p>
      </div>
      <ProviderMessagesTab />
    </div>
  );
}
