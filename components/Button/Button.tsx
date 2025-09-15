import { cva, type VariantProps } from "class-variance-authority"

import { twMerge } from "tailwind-merge"

const button = cva(
  [
    "justify-center",
    "inline-flex",
    "items-center",
    "rounded-xl",
    "text-center",
    "border",
    "border-blue-400",
    "transition-colors",
    "delay-50",
  ],
  {
    variants: {
      intent: {
        primary: ["bg-blue-400", "text-white", "hover:enabled:bg-blue-700"],
        secondary: ["bg-transparent", "text-blue-400", "hover:enabled:bg-blue-400", "hover:enabled:text-white"],
      },
      size: {
        sm: ["min-w-20", "h-full", "min-h-10", "text-sm", "py-1.5", "px-4"],
        lg: ["min-w-32", "h-full", "min-h-12", "text-lg", "py-2.5", "px-6"],
      },
      underline: { true: ["underline"], false: [] },
    },
    defaultVariants: {
      intent: "primary",
      size: "lg",
    },
  }
)

/**
 * Props for button component when used as a link.
 */
export interface LinkButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof button> {
  underline?: boolean
  href: string
}

/**
 * Props for button component when used as a form button.
 */
export interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  underline?: boolean
}

/**
 * Union type for all button component props.
 */
export type ButtonProps = LinkButtonProps | FormButtonProps

/**
 * Type guard to check if button props are for a link button.
 * 
 * @param props - The button props to check
 * @returns True if props are for a link button
 */
function isLinkButton(props: ButtonProps): props is LinkButtonProps {
  return "href" in props
}

/**
 * A flexible button component that can render as either a button or link.
 * 
 * @param props - The button props (either LinkButtonProps or FormButtonProps)
 * @returns JSX element for button or link
 */
export function Button(props: ButtonProps) {
  const { className, intent, size, underline, ...restProps } = props

  if (isLinkButton(props)) {
    const { href, ...linkProps } = restProps as LinkButtonProps
    return (
      <a href={href} className={twMerge(button({ intent, size, className, underline }))} {...linkProps}>
        {props.children}
      </a>
    )
  } else {
    const buttonProps = restProps as FormButtonProps
    return (
      <button className={twMerge(button({ intent, size, className, underline }))} {...buttonProps}>
        {props.children}
      </button>
    )
  }
}
