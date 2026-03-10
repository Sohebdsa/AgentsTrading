// ─── Shared application types ────────────────

export interface NavLink {
    label: string;
    href: string;
}

export interface LoginOption {
    label: string;
    href: string;
}

export interface NavItemsProps {
    mobile?: boolean;
    onClose?: () => void;
}
