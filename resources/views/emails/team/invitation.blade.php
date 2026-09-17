<x-mail::message>
# You have been invited to join the team

You have been invited to join the team as a **{{ ucfirst($invitation->role) }}**.

To accept this invitation and access your account, please sign in securely using your Google account:

<x-mail::button :url="route('auth.google')">
Sign in with Google
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
