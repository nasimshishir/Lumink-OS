import { Head, Link } from '@inertiajs/react';
import { MonitorPlay } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';

function GoogleIcon() {
    return (
        <svg aria-hidden="true" data-icon="inline-start" viewBox="0 0 24 24">
            <path
                fill="#4285f4"
                d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.25c1.9-1.75 2.97-4.33 2.97-7.39Z"
            />
            <path
                fill="#34a853"
                d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.03v2.61A10 10 0 0 0 12 22Z"
            />
            <path
                fill="#fbbc05"
                d="M6.39 13.92A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.03A10 10 0 0 0 2 12c0 1.62.39 3.15 1.03 4.53l3.36-2.61Z"
            />
            <path
                fill="#ea4335"
                d="M12 5.95c1.48 0 2.8.51 3.85 1.5l2.86-2.86A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.97 5.47l3.36 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
            />
        </svg>
    );
}

function InkTrail() {
    return (
        <svg
            aria-hidden="true"
            className="lumink-login-trail"
            viewBox="0 0 650 760"
            fill="none"
        >
            <path
                d="M84 722C202 659 262 587 286 505c27-93 9-179 75-246 49-50 120-58 205-39"
                stroke="currentColor"
                strokeOpacity=".14"
                strokeWidth="2"
            />
            <path
                d="M154 746c100-92 133-167 132-246-1-103-54-176-5-262 34-61 103-99 217-107"
                stroke="currentColor"
                strokeOpacity=".25"
                strokeWidth="3"
            />
            <path
                d="M228 749c66-102 69-188 37-260-40-91-108-142-78-233 23-70 90-127 211-169"
                stroke="currentColor"
                strokeOpacity=".48"
                strokeWidth="5"
            />
            <path
                d="M305 742c29-102 5-177-44-237-67-82-137-113-127-202 8-72 68-142 177-209"
                stroke="currentColor"
                strokeWidth="8"
            />
            <circle cx="134" cy="303" r="8" fill="currentColor" />
            <circle cx="187" cy="256" r="5" fill="currentColor" />
            <circle cx="311" cy="94" r="11" fill="currentColor" />
            <circle cx="398" cy="87" r="5" fill="currentColor" opacity=".7" />
            <circle cx="498" cy="131" r="7" fill="currentColor" opacity=".5" />
        </svg>
    );
}

export default function Login() {
    return (
        <>
            <Head title="Sign in" />
            <main className="lumink-login">
                <section className="lumink-login-brand">
                    <div className="lumink-login-brand-glow" />
                    <InkTrail />

                    <div className="lumink-login-lockup">
                        <AppLogoIcon className="lumink-login-logo" />
                        <div>
                            <p className="lumink-login-wordmark">Lumink Co.</p>
                            <p className="lumink-login-product">Agency OS</p>
                        </div>
                    </div>

                    <div className="lumink-login-statement">
                        <p className="lumink-login-eyebrow">
                            Built for the work behind the work
                        </p>
                        <h1>Your agency, in one place.</h1>
                        <p>
                            Plan content. Move work forward. Know what’s
                            profitable.
                        </p>
                    </div>
                </section>

                <section className="lumink-login-access">
                    <div className="lumink-login-mobile-lockup">
                        <AppLogoIcon className="lumink-login-logo" />
                        <div>
                            <p className="lumink-login-wordmark">Lumink Co.</p>
                            <p className="lumink-login-product">Agency OS</p>
                        </div>
                    </div>

                    <div className="lumink-login-form">
                        <p className="lumink-login-private">
                            Private workspace
                        </p>
                        <h2>Welcome back</h2>
                        <p className="lumink-login-description">
                            Sign in with your invited Google account to
                            continue.
                        </p>

                        <div className="lumink-login-actions">
                            <Button asChild size="lg">
                                <a href="/auth/google">
                                    <GoogleIcon />
                                    Continue with Google
                                </a>
                            </Button>

                            {import.meta.env.DEV && (
                                <Button asChild variant="outline" size="lg">
                                    <Link href="/demo-login">
                                        <MonitorPlay data-icon="inline-start" />
                                        Open local demo
                                    </Link>
                                </Button>
                            )}
                        </div>

                        <div className="lumink-login-invite">
                            <span />
                            <p>Invite-only access managed by Lumink Co.</p>
                            <span />
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
