<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinanceIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_updates_invoice_status_and_cannot_exceed_balance(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = $this->business();
        $invoice = Invoice::create([
            'business_id' => $business->id,
            'number' => 'INV-TEST-001',
            'status' => 'sent',
            'issue_date' => today(),
            'due_date' => today()->addWeek(),
            'subtotal' => 1000,
            'total' => 1000,
        ]);

        $this->actingAs($owner)->post("/invoices/{$invoice->id}/payments", [
            'amount' => 400,
            'paid_on' => today()->toDateString(),
            'method' => 'Bank transfer',
        ])->assertRedirect();

        $this->assertDatabaseHas('invoices', ['id' => $invoice->id, 'status' => 'partial']);
        $this->assertDatabaseHas('payments', ['invoice_id' => $invoice->id, 'amount' => 400]);

        $this->actingAs($owner)->post("/invoices/{$invoice->id}/payments", [
            'amount' => 601,
            'paid_on' => today()->toDateString(),
        ])->assertSessionHasErrors('amount');

        $this->actingAs($owner)->post("/invoices/{$invoice->id}/payments", [
            'amount' => 600,
            'paid_on' => today()->toDateString(),
        ])->assertRedirect();

        $this->assertDatabaseHas('invoices', ['id' => $invoice->id, 'status' => 'paid']);
    }

    public function test_business_profitability_only_subtracts_current_month_direct_expenses(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = $this->business();

        Expense::create([
            'business_id' => $business->id,
            'allocation_type' => 'direct',
            'category' => 'shoots',
            'description' => 'Current shoot',
            'amount' => 2000,
            'spent_on' => today(),
        ]);
        Expense::create([
            'business_id' => $business->id,
            'allocation_type' => 'overhead',
            'category' => 'subscriptions',
            'description' => 'Agency software',
            'amount' => 3000,
            'spent_on' => today(),
        ]);
        Expense::create([
            'business_id' => $business->id,
            'allocation_type' => 'direct',
            'category' => 'shoots',
            'description' => 'Old shoot',
            'amount' => 5000,
            'spent_on' => today()->subMonth(),
        ]);

        $this->actingAs($owner)
            ->get("/businesses/{$business->id}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('profitability.directExpenses', 2000)
                ->where('profitability.margin', 23000));
    }

    public function test_direct_expense_requires_a_business(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)->post('/expenses', [
            'allocation_type' => 'direct',
            'category' => 'shoots',
            'description' => 'Unallocated direct cost',
            'amount' => 100,
            'spent_on' => today()->toDateString(),
        ])->assertSessionHasErrors('business_id');
    }

    public function test_invoice_numbers_are_not_derived_from_the_current_record_count(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);
        $business = $this->business();
        $payload = [
            'business_id' => $business->id,
            'issue_date' => today()->toDateString(),
            'due_date' => today()->addWeek()->toDateString(),
            'description' => 'Monthly retainer',
            'amount' => 25000,
        ];

        $this->actingAs($owner)->post('/invoices', $payload)->assertRedirect();
        $this->actingAs($owner)->post('/invoices', $payload)->assertRedirect();

        $numbers = Invoice::pluck('number');
        $this->assertCount(2, $numbers);
        $this->assertCount(2, $numbers->unique());
        $this->assertTrue($numbers->every(fn (string $number) => str_starts_with($number, 'INV-'.now()->format('Ym').'-')));
    }

    private function business(): Business
    {
        return Business::create([
            'name' => 'Client',
            'slug' => 'client',
            'monthly_retainer' => 25000,
        ]);
    }
}
