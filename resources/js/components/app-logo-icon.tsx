import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M24 1C18.8 13.7 5 25.1 5 40.7 5 53 13.3 62 24 62s19-9 19-21.3C43 25.1 29.2 13.7 24 1Z"
                fill="currentColor"
            />
            <path
                d="M16 25c4 4 12 4 16 0"
                fill="none"
                stroke="#101b63"
                strokeLinecap="round"
                strokeWidth="4"
            />
        </svg>
    );
}
