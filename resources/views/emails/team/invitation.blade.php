<x-mail::message>
@if($invitation->role === 'client')
# Review content for {{ $invitation->business?->name ?? 'your brand' }}

You have been invited as a **Client Reviewer** for **{{ $invitation->business?->name ?? 'your brand' }}** on {{ config('app.name') }}.

You can review creative deliverables, provide feedback, and give approval directly in the system:
@else
# You have been invited to join the team

You have been invited to join the team as a **{{ ucfirst($invitation->role) }}**.

To accept this invitation and access your account, please sign in securely using your Google account:
@endif

<x-mail::button :url="route('auth.google')">
Sign in with Google
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
