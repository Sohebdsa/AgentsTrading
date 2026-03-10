import Header from './Header/Header';

interface LayoutProps {
    children: React.ReactNode;
}

/**
 * Root layout wrapper.
 * Wrap any page with <Layout> to get the sticky header + page container.
 *
 * Usage:
 *   <Layout>
 *     <YourPage />
 *   </Layout>
 */
const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="cxa-root">
            <Header />
            <main className="cxa-main">
                {children}
            </main>
        </div>
    );
};

export default Layout;
