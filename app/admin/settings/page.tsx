import SettingsPanel from '@/components/admin/SettingsPanel';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default function AdminSettingsPage() {
  return <SettingsPanel initial={getSettings()} />;
}
