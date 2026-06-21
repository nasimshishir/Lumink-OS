<?php

namespace Database\Seeders;

use App\Models\ApprovalRequest;
use App\Models\Business;
use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PerformancePeriod;
use App\Models\PlatformVersion;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $nasim = User::create([
            'name' => 'Nasim',
            'email' => 'nasim@luminkco.com',
            'password' => Hash::make('local-demo-password'),
            'role' => 'owner',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $manager = User::create([
            'name' => 'Anika',
            'email' => 'manager@luminkco.com',
            'password' => Hash::make(Str::random(32)),
            'role' => 'manager',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $editor = User::create([
            'name' => 'Rakib',
            'email' => 'editor@luminkco.com',
            'password' => Hash::make(Str::random(32)),
            'role' => 'specialist',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $designer = User::create([
            'name' => 'Rifat',
            'email' => 'design@luminkco.com',
            'password' => Hash::make(Str::random(32)),
            'role' => 'specialist',
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $fresh = Business::create([
            'name' => 'Fresh & Juicy',
            'slug' => 'fresh-and-juicy',
            'primary_contact_name' => 'Fresh & Juicy Owners',
            'primary_contact_phone' => '+880 1700 000000',
            'monthly_retainer' => 20000,
            'agreement_start' => now()->startOfMonth(),
            'agreement_end' => now()->addYear(),
            'platforms' => ['facebook' => 'freshandjuicy', 'instagram' => 'freshandjuicy', 'tiktok' => 'freshandjuicy'],
            'brand_profile' => ['voice' => 'Casual, funny, emoji-heavy, bestie/fam energy', 'colors' => ['#111827', '#f6c44d']],
            'deliverable_targets' => ['reels' => 10, 'stories' => 12, 'static' => 4, 'shoots' => 4],
        ]);
        $zaitoon = Business::create([
            'name' => 'Zaitoon Restaurant',
            'slug' => 'zaitoon-restaurant',
            'primary_contact_name' => 'Fahim Ahmed',
            'primary_contact_email' => 'fahim@zaitoon.example',
            'primary_contact_phone' => '+880 1712 345678',
            'monthly_retainer' => 25000,
            'agreement_start' => now()->startOfMonth(),
            'agreement_end' => now()->addYear(),
            'platforms' => ['facebook' => 'zaitoonrestaurantbd', 'instagram' => 'zaitoon.dhaka', 'tiktok' => 'zaitoon.dhaka'],
            'brand_profile' => ['voice' => 'Warm, premium, sensory and family-focused', 'colors' => ['#070707', '#d4a928']],
            'deliverable_targets' => ['reels' => 18, 'stories' => 12, 'static' => 4, 'shoots' => 6],
        ]);

        $eidCampaign = Campaign::create([
            'business_id' => $zaitoon->id,
            'name' => 'Eid Mubarak Special Offer',
            'objective' => 'Drive orders and footfall',
            'target_audience' => 'Families and young professionals in Cumilla',
            'offer' => '15% off selected menu items',
            'featured_items' => ['Chicken Biryani', 'Mutton Rezala', 'Firni'],
            'starts_on' => now()->startOfMonth(),
            'ends_on' => now()->addDays(10),
            'budget' => 8000,
        ]);
        $menuCampaign = Campaign::create([
            'business_id' => $zaitoon->id,
            'name' => 'Featured Menu Items',
            'objective' => 'Increase menu awareness',
            'target_audience' => 'Food lovers aged 18–40',
            'featured_items' => ['Biryani', 'BBQ platter', 'Kebab'],
            'starts_on' => now()->startOfMonth(),
            'ends_on' => now()->endOfMonth(),
            'budget' => 6000,
        ]);
        $freshCampaign = Campaign::create([
            'business_id' => $fresh->id,
            'name' => 'Monsoon Refresh',
            'objective' => 'Increase visits and delivery orders',
            'target_audience' => 'Students and young professionals',
            'offer' => 'Seasonal smoothie launch',
            'starts_on' => now()->startOfMonth(),
            'ends_on' => now()->endOfMonth(),
        ]);

        $eidReel = ContentItem::create([
            'business_id' => $zaitoon->id,
            'campaign_id' => $eidCampaign->id,
            'owner_id' => $editor->id,
            'title' => 'Eid Offer Reel',
            'type' => 'reel',
            'stage' => 'client_review',
            'priority' => 'high',
            'brief' => 'Promote the Eid special with 15% off selected dishes and create urgency around the limited-time offer.',
            'hook' => 'Eid is better with delicious food!',
            'script' => 'Eid Mubarak! Celebrate with Zaitoon’s special menu and enjoy 15% off selected items.',
            'cta' => 'Book your table or order now via WhatsApp.',
            'target_audience' => 'Families, young professionals, and food lovers in Cumilla.',
            'featured_items' => ['Mutton Rezala', 'Chicken Biryani', 'Nihari', 'Firni'],
            'shoot_notes' => 'Warm lighting, steam close-ups, restaurant ambience, and vertical shots for Reels.',
            'publish_at' => now()->addDays(2)->setTime(19, 30),
            'revision_number' => 3,
        ]);
        foreach (['facebook', 'instagram', 'tiktok'] as $platform) {
            PlatformVersion::create([
                'content_item_id' => $eidReel->id,
                'platform' => $platform,
                'caption' => 'Eid Mubarak! Celebrate with Zaitoon and enjoy 15% off selected items. #EidOffer',
                'format' => '9:16 vertical',
                'status' => $platform === 'instagram' ? 'client_review' : 'draft',
                'publish_at' => $eidReel->publish_at,
            ]);
        }

        $contentRows = [
            [$fresh, $freshCampaign, 'Ramadan Iftar Promo', 'editing', 'reel', now()->subDay(), $editor],
            [$zaitoon, $menuCampaign, 'New Menu Photos', 'shot', 'photo', now(), $nasim],
            [$fresh, $freshCampaign, 'Weekend Special Banner', 'editing', 'static', now()->addHours(4), $designer],
            [$zaitoon, $eidCampaign, 'Iftar Moments TikTok', 'client_review', 'reel', now()->setTime(19, 30), $manager],
            [$fresh, $freshCampaign, 'Seasonal Smoothie Story', 'scripted', 'story', now()->addDays(2), $manager],
        ];
        foreach ($contentRows as [$business, $campaign, $title, $stage, $type, $publishAt, $owner]) {
            $item = ContentItem::create([
                'business_id' => $business->id,
                'campaign_id' => $campaign->id,
                'owner_id' => $owner->id,
                'title' => $title,
                'stage' => $stage,
                'type' => $type,
                'publish_at' => $publishAt,
                'brief' => 'Produce platform-native content aligned with the campaign objective.',
            ]);
            PlatformVersion::create([
                'content_item_id' => $item->id,
                'platform' => 'instagram',
                'status' => $stage,
                'publish_at' => $publishAt,
            ]);
        }

        $tasks = [
            [$fresh, 'Ramadan Iftar Promo – Final Edit', 'video_edit', 'high', now()->subDay(), $editor, null],
            [$zaitoon, 'Menu Shoot – New Biryani & BBQ Items', 'shoot', 'high', now()->setTime(11, 0), $nasim, null],
            [$fresh, 'Banner – Weekend Special', 'graphic_design', 'medium', now()->setTime(14, 0), $designer, null],
            [$fresh, 'Iftar Promo – Client Approval', 'approval', 'high', now()->setTime(16, 30), $manager, null],
            [$zaitoon, 'Iftar Moments – TikTok Publish', 'publish', 'high', now()->setTime(19, 30), $manager, null],
            [$zaitoon, 'Eid Offer Reel – Final Revision', 'video_edit', 'medium', now()->addDay(), $editor, $eidReel],
        ];
        foreach ($tasks as [$business, $title, $type, $priority, $dueAt, $owner, $content]) {
            Task::create([
                'business_id' => $business->id,
                'content_item_id' => $content?->id,
                'owner_id' => $owner->id,
                'created_by' => $nasim->id,
                'title' => $title,
                'type' => $type,
                'priority' => $priority,
                'status' => $content ? 'in_progress' : 'todo',
                'due_at' => $dueAt,
                'estimate_minutes' => $type === 'shoot' ? 120 : 90,
                'actual_minutes' => $content ? 380 : 0,
            ]);
        }

        ApprovalRequest::create([
            'content_item_id' => $eidReel->id,
            'created_by' => $nasim->id,
            'token' => 'lumink-demo-approval',
            'status' => 'pending',
            'version' => 3,
            'expires_at' => now()->addDays(30),
        ]);

        $freshInvoice = Invoice::create([
            'business_id' => $fresh->id,
            'number' => 'INV-'.now()->format('Ym').'-001',
            'status' => 'paid',
            'issue_date' => now()->startOfMonth(),
            'due_date' => now()->startOfMonth()->addDays(7),
            'subtotal' => 20000,
            'total' => 20000,
        ]);
        $freshInvoice->lines()->create(['description' => 'Monthly retainer', 'quantity' => 1, 'unit_price' => 20000, 'total' => 20000]);
        $freshInvoice->payments()->create(['amount' => 20000, 'paid_on' => now()->startOfMonth()->addDays(5), 'method' => 'Bank transfer']);

        $zaitoonInvoice = Invoice::create([
            'business_id' => $zaitoon->id,
            'number' => 'INV-'.now()->format('Ym').'-002',
            'status' => 'sent',
            'issue_date' => now()->startOfMonth(),
            'due_date' => now()->addDay(),
            'subtotal' => 25000,
            'total' => 25000,
        ]);
        $zaitoonInvoice->lines()->create(['description' => 'Monthly retainer', 'quantity' => 1, 'unit_price' => 25000, 'total' => 25000]);

        $expenseRows = [
            [$fresh, 'direct', 'shoots', 'Studio light rental', 2500, true],
            [$zaitoon, 'direct', 'transport', 'Location transport', 1200, true],
            [$fresh, 'direct', 'equipment', 'Camera lens filter', 2800, false],
            [$fresh, 'direct', 'props', 'Table props and set', 1800, false],
            [$zaitoon, 'direct', 'freelancers', 'Editing support', 5200, true],
            [null, 'overhead', 'subscriptions', 'Adobe Creative Cloud', 1600, true],
            [null, 'overhead', 'administration', 'Office and communications', 4900, true],
        ];
        foreach ($expenseRows as [$business, $allocation, $category, $description, $amount, $hasReceipt]) {
            Expense::create([
                'business_id' => $business?->id,
                'created_by' => $nasim->id,
                'allocation_type' => $allocation,
                'category' => $category,
                'description' => $description,
                'amount' => $amount,
                'spent_on' => now()->subDays(random_int(1, 7)),
                'payment_method' => $category === 'transport' ? 'Cash' : 'bKash',
                'receipt_path' => $hasReceipt ? 'receipts/demo.pdf' : null,
            ]);
        }

        PerformancePeriod::create([
            'business_id' => $zaitoon->id,
            'campaign_id' => $eidCampaign->id,
            'starts_on' => now()->startOfMonth(),
            'ends_on' => now()->startOfMonth()->addDays(14),
            'sales_change_percent' => 18.4,
            'baseline_label' => 'Previous 15 days',
            'metrics' => ['reach' => 48200, 'engagement_rate' => 4.8, 'followers_gained' => 312],
            'notes' => 'Eid campaign increased family-platter orders.',
            'next_actions' => 'Repeat the strongest food close-up format and test a reservation CTA.',
        ]);
    }
}
