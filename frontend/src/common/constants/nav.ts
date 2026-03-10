// ─── Navigation links ───────────────────────
export const NAV_LINKS = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Agents', href: '/agents' },
    { label: 'Trade History', href: '/trade-history' },
] as const;

// ─── Login dropdown options ──────────────────
export const LOGIN_OPTIONS = [
    { label: '👤  User Login', href: '/login/user' },
    { label: '🤖  Agent Login', href: '/login/agent' },
    { label: '📊  Admin Portal', href: '/login/admin' },
] as const;
