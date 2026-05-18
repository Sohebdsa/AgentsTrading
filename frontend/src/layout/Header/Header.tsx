import { useState } from 'react';
import { Link } from 'react-router-dom';
import NavItems from './NavItems';
import './Header.css';

const Header = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="cxa-header">
            <div className="cxa-header-inner">

                {/* Logo */}
                <Link to="/" className="cxa-logo" aria-label="CubeXAgents home">
                    <span className="cxa-logo-cube" aria-hidden="true">⬡</span>
                    <span className="cxa-logo-text">
                        Cube<span className="cxa-logo-accent">X</span>Agents
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="cxa-nav" aria-label="Main navigation">
                    <NavItems />
                </nav>

                {/* Mobile hamburger */}
                <button
                    className={`cxa-hamburger ${menuOpen ? 'open' : ''}`}
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>

            {/* Mobile drawer */}
            <div
                className={`cxa-mobile-nav ${menuOpen ? 'open' : ''}`}
                aria-hidden={!menuOpen}
            >
                <NavItems mobile onClose={() => setMenuOpen(false)} />
            </div>
        </header>
    );
};

export default Header;
