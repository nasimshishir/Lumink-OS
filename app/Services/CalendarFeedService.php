<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class CalendarFeedService
{
    /**
     * Generate an RFC 5545 compliant iCalendar string from events.
     *
     * @param  array<int, array<string, mixed>>  $events
     */
    public function generateIcs(array $events, string $calendarName = 'Lumink OS Schedule'): string
    {
        $now = Carbon::now('UTC')->format('Ymd\THis\Z');

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lumink OS//Agency Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:'.$this->escapeText($calendarName),
            'X-WR-TIMEZONE:UTC',
        ];

        foreach ($events as $event) {
            $startDate = null;
            if (! empty($event['date'])) {
                $startDate = Carbon::parse($event['date'])->setTimezone('UTC');
            } elseif (! empty($event['due_date'])) {
                $startDate = Carbon::parse($event['due_date'])->setTimezone('UTC');
            }

            if (! $startDate instanceof CarbonInterface) {
                continue;
            }

            $endDate = null;
            if (! empty($event['end_date'])) {
                $endDate = Carbon::parse($event['end_date'])->setTimezone('UTC');
            } else {
                $endDate = $startDate->copy()->addHour();
            }

            $uid = ($event['id'] ?? uniqid('event-', true)).'@lumink.co';
            $summary = '['.strtoupper((string) ($event['event_type'] ?? 'EVENT')).'] '.($event['title'] ?? 'Scheduled Item');
            if (! empty($event['business']['name'])) {
                $summary .= ' ('.$event['business']['name'].')';
            }

            $descParts = [];
            if (! empty($event['description'])) {
                $descParts[] = $event['description'];
            }
            if (! empty($event['business']['name'])) {
                $descParts[] = 'Business: '.$event['business']['name'];
            }
            if (! empty($event['status'])) {
                $descParts[] = 'Status: '.$event['status'];
            }
            if (! empty($event['priority'])) {
                $descParts[] = 'Priority: '.$event['priority'];
            }
            if (! empty($event['owner']['name'])) {
                $descParts[] = 'Assigned: '.$event['owner']['name'];
            }
            if (! empty($event['url'])) {
                $descParts[] = 'Link: '.url($event['url']);
            }

            $description = implode("\n", $descParts);

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:'.$this->escapeText($uid);
            $lines[] = 'DTSTAMP:'.$now;
            $lines[] = 'DTSTART:'.$startDate->format('Ymd\THis\Z');
            $lines[] = 'DTEND:'.$endDate->format('Ymd\THis\Z');
            $lines[] = 'SUMMARY:'.$this->escapeText($summary);
            if ($description !== '') {
                $lines[] = 'DESCRIPTION:'.$this->escapeText($description);
            }
            if (! empty($event['location'])) {
                $lines[] = 'LOCATION:'.$this->escapeText($event['location']);
            }
            if (! empty($event['url'])) {
                $lines[] = 'URL:'.$this->escapeText(url($event['url']));
            }
            $lines[] = 'STATUS:CONFIRMED';
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        // Join with CRLF as per RFC 5545
        return implode("\r\n", $lines)."\r\n";
    }

    protected function escapeText(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace(';', '\;', $text);
        $text = str_replace(',', '\,', $text);

        return str_replace(["\r\n", "\n", "\r"], '\n', $text);
    }
}
