import { Head, router } from '@inertiajs/react';
import { CheckCircle2, ExternalLink, FolderPlus, Unplug } from 'lucide-react';
import Heading from '@/components/heading';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';

type DriveConnection = {
    id: number;
    google_email: string;
    expires_at?: string;
};

type Business = {
    id: number;
    name: string;
    drive_folder_url?: string;
};

export default function Integrations({
    driveConnection,
    businesses,
}: {
    driveConnection?: DriveConnection;
    businesses: Business[];
}) {
    return (
        <>
            <Head title="Integrations" />
            <div className="flex flex-col gap-6">
                <Heading
                    title="Integrations"
                    description="Connect the single Lumink Google account used for agency media."
                />
                <section className="lumink-panel overflow-hidden">
                    <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold">Google Drive</h2>
                                <StatusBadge
                                    value={
                                        driveConnection
                                            ? 'connected'
                                            : 'not_connected'
                                    }
                                />
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {driveConnection
                                    ? `Connected as ${driveConnection.google_email}`
                                    : 'Create standardized client and campaign folders in one Lumink-owned Drive.'}
                            </p>
                        </div>
                        {driveConnection ? (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.delete(
                                        '/settings/integrations/google-drive',
                                    )
                                }
                            >
                                <Unplug data-icon="inline-start" />
                                Disconnect
                            </Button>
                        ) : (
                            <Button asChild>
                                <a href="/settings/integrations/google-drive">
                                    Connect Google Drive
                                    <ExternalLink data-icon="inline-end" />
                                </a>
                            </Button>
                        )}
                    </div>
                    <div className="p-5">
                        <h3 className="text-sm font-semibold">
                            Business folders
                        </h3>
                        <div className="mt-3 flex flex-col divide-y rounded-md border">
                            {businesses.map((business) => (
                                <div
                                    key={business.id}
                                    className="flex items-center justify-between gap-4 p-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {business.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {business.drive_folder_url
                                                ? 'Folder structure provisioned'
                                                : 'No Drive folder yet'}
                                        </p>
                                    </div>
                                    {business.drive_folder_url ? (
                                        <Button
                                            asChild
                                            variant="ghost"
                                            size="sm"
                                        >
                                            <a
                                                href={business.drive_folder_url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <CheckCircle2 data-icon="inline-start" />
                                                Open
                                            </a>
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={!driveConnection}
                                            onClick={() =>
                                                router.post(
                                                    `/businesses/${business.id}/drive`,
                                                )
                                            }
                                        >
                                            <FolderPlus data-icon="inline-start" />
                                            Create folders
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
