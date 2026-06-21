import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-10 items-center justify-center text-[#f4c34e]">
                <AppLogoIcon className="size-8" />
            </div>
            <div className="grid flex-1 text-left">
                <span className="truncate text-base leading-tight font-semibold">
                    Lumink Co.
                </span>
                <span className="text-[10px] tracking-[0.18em] text-sidebar-foreground/55 uppercase">
                    Agency OS
                </span>
            </div>
        </>
    );
}
