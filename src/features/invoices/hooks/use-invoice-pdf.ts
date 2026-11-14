import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { errorText } from '@/features/events/lib/messages';
import { useAuthToken } from '@/hooks/use-auth-token';
import { Feedback } from '@/lib/haptics';
import { shareFromLink } from '@/lib/share-file';
import { InvoiceService } from '@/services/invoice-service';
import type { InvoiceAudience } from '@/types/invoice';
import { pdfName } from '../lib/invoices';

/**
 * Opens or shares a document's PDF through its signed link. The link lasts 10 minutes, so each tap fetches the document
 * again for a fresh one; the browser and the share sheet never get the sign-in token.
 */
export function useInvoicePdf(audience: InvoiceAudience, id: string) {
  const token = useAuthToken();
  const [busy, setBusy] = useState<'open' | 'share' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: 'open' | 'share') => {
    if (busy) return;
    Feedback.tap();
    setBusy(action);
    setError(null);
    try {
      const fresh = await InvoiceService.get(token, audience, id);
      if (action === 'open') await WebBrowser.openBrowserAsync(fresh.pdfUrl);
      else await shareFromLink(fresh.pdfUrl, { folder: ['invoices', fresh.id], name: pdfName(fresh.number), mimeType: 'application/pdf' });
    } catch (err) {
      Feedback.error();
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return { busy, error, open: () => run('open'), share: () => run('share') };
}
