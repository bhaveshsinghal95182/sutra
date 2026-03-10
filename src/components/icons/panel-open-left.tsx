import { type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

export const PanelOpenLeft = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = 'currentColor', size = 24, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill={color}
        className={className}
        {...props}
      >
        <title>open-panel--solid--left</title>
        <path d="M28,4H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V6A2,2,0,0,0,28,4Zm0,22H12V6H28Z" />
      </svg>
    );
  }
);

PanelOpenLeft.displayName = 'PanelOpenLeft';

export default PanelOpenLeft;
