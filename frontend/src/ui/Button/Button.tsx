import './Button.css';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    as?: 'button' | 'a';
    href?: string;
}

const Button = ({
    variant = 'primary',
    size = 'md',
    as: Tag = 'button',
    href,
    className = '',
    children,
    ...rest
}: ButtonProps) => {
    const classes = `btn btn--${variant} btn--${size} ${className}`.trim();

    if (Tag === 'a') {
        return (
            <a href={href} className={classes} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
                {children}
            </a>
        );
    }

    return (
        <button className={classes} {...rest}>
            {children}
        </button>
    );
};

export default Button;
