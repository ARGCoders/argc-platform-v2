import {
  DashboardShell,
  DASHBOARD_SHELL_ID,
} from '@/components/shared/dashboard/dashboard-shell'
import { DASHBOARD_THEME_KEY } from '@/lib/dashboard-theme-context'

/**
 * Blocking, pre-hydration: DashboardShell always server-renders with `dark`
 * applied (it can't know localStorage during SSR, and dark is the stated
 * default anyway — no flash for the common case). This corrects the one
 * case that would otherwise flash: a user who already chose light. Runs
 * once, targets the shell by its stable id — never `<html>` — so it can
 * only ever affect the dashboard root, matching DashboardShell's own scoping.
 */
const NO_FLASH_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(DASHBOARD_THEME_KEY)})==='light'){var el=document.getElementById(${JSON.stringify(DASHBOARD_SHELL_ID)});if(el)el.classList.remove('dark');}}catch(e){}})();`

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
    </>
  )
}
