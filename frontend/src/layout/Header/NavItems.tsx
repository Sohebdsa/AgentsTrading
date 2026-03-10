import { useState, useRef, useEffect } from 'react';
import { NAV_LINKS, LOGIN_OPTIONS } from '../../common/constants/nav';
import type { NavItemsProps } from '../../common/types';

const NavItems = ({ mobile = false, onClose }: NavItemsProps) => {
    const [loginOpen, setLoginOpen] = useState(false);
    const dropdownRef = useRef<HTMLLIElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setLoginOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = (href: string) =>
        window.location.pathname === href ? 'active' : '';

    return (
        <ul className={`cxa-nav-list ${mobile ? 'mobile' : ''}`}>
            {NAV_LINKS.map((link) => (
                <li key={link.label}>
                    <a
                        href={link.href}
                        className={`cxa-nav-link ${isActive(link.href)}`}
                        onClick={onClose}
                    >
                        {link.label}
                    </a>
                </li>
            ))}

            {/* Login with hover/click dropdown */}
            <li
                className="cxa-nav-dropdown-wrapper"
                ref={dropdownRef}
                onMouseEnter={() => !mobile && setLoginOpen(true)}
                onMouseLeave={() => !mobile && setLoginOpen(false)}
            >
                <button
                    className="cxa-nav-link cxa-login-btn"
                    onClick={() => mobile && setLoginOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={loginOpen}
                >
                    Login
                    <svg
                        className={`cxa-chevron ${loginOpen ? 'up' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        aria-hidden="true"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>

                <ul className={`cxa-dropdown ${loginOpen ? 'visible' : ''}`} role="listbox">
                    {LOGIN_OPTIONS.map((opt) => (
                        <li key={opt.href} role="option">
                            <a href={opt.href} className="cxa-dropdown-item" onClick={onClose}>
                                {opt.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </li>
        </ul>
    );
};

export default NavItems;
