<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\ContentItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AgentSchemaController extends Controller
{
    /**
     * Return machine-readable capabilities manifest for AI agents.
     */
    public function capabilities(Request $request): JsonResponse
    {
        $businesses = Business::where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'industry', 'monthly_retainer', 'drive_folder_url', 'deliverable_targets'])
            ->map(fn (Business $b) => [
                'id' => $b->id,
                'name' => $b->name,
                'slug' => $b->slug,
                'industry' => $b->industry,
                'monthly_retainer' => (float) $b->monthly_retainer,
                'drive_folder_url' => $b->drive_folder_url,
                'deliverable_targets' => $b->deliverable_targets,
            ]);

        return response()->json([
            'status' => 'success',
            'system' => 'Lumink OS - Agency Operating System',
            'version' => '1.0.0',
            'agent_role' => 'Content Strategist, Task Planner, and Asset Coordinator',
            'auth' => [
                'type' => 'Bearer Token',
                'header' => 'Authorization: Bearer <your-agent-token>',
            ],
            'workflows' => [
                '1_strategy_discovery' => [
                    'description' => 'Inspect active client businesses, their retainer targets, and brand profiles.',
                    'action' => 'GET /api/v1/businesses or GET /api/v1/businesses/{id}',
                ],
                '1b_broll_bank_inspection' => [
                    'description' => 'Search existing shoot archive & B-roll library for footage keywords (e.g. sizzle, cocktail, chef) to reuse in content without scheduling new shoots.',
                    'action' => 'GET /api/v1/shoots?business_id={id}&tag={keyword}&has_footage=true',
                ],
                '2_content_planning' => [
                    'description' => 'Create strategic content deliverables with script, hook, brief, target audience, and optional initial tasks. Can link primary_shoot_id and referenced_shoot_ids to reuse archive footage.',
                    'action' => 'POST /api/v1/content',
                ],
                '3_task_definition' => [
                    'description' => 'Define sub-tasks for content (scripting, filming, editing, thumbnail design) with estimates and deadlines.',
                    'action' => 'POST /api/v1/tasks or embed tasks in POST /api/v1/content',
                ],
                '4_shots_and_drive_linking' => [
                    'description' => 'Link shoots by date or content. Content can link primary_shoot_id and referenced_shoot_ids to pull B-roll from multiple past shoots without linking file by file.',
                    'action' => 'PATCH /api/v1/content/{id} with primary_shoot_id and referenced_shoot_ids: [id1, id2]',
                ],
                '5_task_progress_tracking' => [
                    'description' => 'Update task status as team or AI works through the checklist.',
                    'action' => 'PATCH /api/v1/tasks/{id} with status: "in_progress" or "done", and actual_minutes',
                ],
                '6_ready_asset_handoff' => [
                    'description' => 'When content is ready for review, link final export asset URL and advance stage to client_review or approved.',
                    'action' => 'PATCH /api/v1/content/{id} with final_asset_url and stage: "client_review"',
                ],
            ],
            'enums' => [
                'content_stages' => ContentItem::STAGES,
                'content_types' => ['reel', 'carousel', 'video', 'photo', 'story', 'post'],
                'content_priorities' => ['low', 'medium', 'high'],
                'task_types' => ['content', 'editing', 'shoot', 'design', 'strategy', 'general'],
                'task_statuses' => ['todo', 'in_progress', 'blocked', 'review', 'done'],
                'task_priorities' => ['low', 'medium', 'high'],
                'shoot_statuses' => ['scheduled', 'completed', 'canceled'],
            ],
            'active_businesses' => $businesses,
        ]);
    }

    /**
     * Return OpenAPI 3.0.3 Specification for LLM tools & function calling.
     */
    public function openapi(Request $request): JsonResponse
    {
        $baseUrl = url('/api/v1');

        $spec = [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'Lumink OS AI Agent API',
                'description' => 'API for AI agents to plan content, schedule tasks, track progress, and link Google Drive shot directories in Lumink OS.',
                'version' => '1.0.0',
            ],
            'servers' => [
                ['url' => $baseUrl, 'description' => 'Primary Lumink OS API Server'],
            ],
            'components' => [
                'securitySchemes' => [
                    'bearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'Sanctum Token',
                    ],
                ],
                'schemas' => [
                    'Task' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer'],
                            'business_id' => ['type' => 'integer', 'nullable' => true],
                            'content_item_id' => ['type' => 'integer', 'nullable' => true],
                            'owner_id' => ['type' => 'integer', 'nullable' => true],
                            'title' => ['type' => 'string'],
                            'description' => ['type' => 'string', 'nullable' => true],
                            'type' => ['type' => 'string', 'enum' => ['content', 'editing', 'shoot', 'design', 'strategy', 'general']],
                            'status' => ['type' => 'string', 'enum' => ['todo', 'in_progress', 'blocked', 'review', 'done']],
                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                            'due_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                            'estimate_minutes' => ['type' => 'integer'],
                            'actual_minutes' => ['type' => 'integer'],
                        ],
                    ],
                    'ContentItem' => [
                        'type' => 'object',
                        'properties' => [
                            'id' => ['type' => 'integer'],
                            'business_id' => ['type' => 'integer'],
                            'title' => ['type' => 'string'],
                            'type' => ['type' => 'string', 'enum' => ['reel', 'carousel', 'video', 'photo', 'story', 'post']],
                            'stage' => ['type' => 'string', 'enum' => ContentItem::STAGES],
                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                            'brief' => ['type' => 'string', 'nullable' => true],
                            'hook' => ['type' => 'string', 'nullable' => true],
                            'script' => ['type' => 'string', 'nullable' => true],
                            'cta' => ['type' => 'string', 'nullable' => true],
                            'target_audience' => ['type' => 'string', 'nullable' => true],
                            'shoot_notes' => ['type' => 'string', 'nullable' => true],
                            'thumbnail_url' => ['type' => 'string', 'format' => 'uri', 'description' => 'Thumbnail / poster image URL', 'nullable' => true],
                            'drive_folder_url' => ['type' => 'string', 'format' => 'uri', 'description' => 'Google Drive directory URL for shots or footage', 'nullable' => true],
                            'raw_footage_url' => ['type' => 'string', 'format' => 'uri', 'nullable' => true],
                            'final_asset_url' => ['type' => 'string', 'format' => 'uri', 'description' => 'Direct link to final export asset', 'nullable' => true],
                            'publish_at' => ['type' => 'string', 'format' => 'date-time', 'nullable' => true],
                        ],
                    ],
                ],
            ],
            'security' => [
                ['bearerAuth' => []],
            ],
            'paths' => [
                '/agent/capabilities' => [
                    'get' => [
                        'summary' => 'Get system capabilities, enums, active businesses, and workflow instructions',
                        'responses' => ['200' => ['description' => 'Successful response']],
                    ],
                ],
                '/businesses' => [
                    'get' => [
                        'summary' => 'List active client business workspaces with deliverable targets and drive folders',
                        'responses' => ['200' => ['description' => 'List of businesses']],
                    ],
                ],
                '/businesses/{id}' => [
                    'get' => [
                        'summary' => 'Get detailed business workspace strategy profile, campaigns, and content progress',
                        'parameters' => [
                            ['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']],
                        ],
                        'responses' => ['200' => ['description' => 'Business details']],
                    ],
                ],
                '/content' => [
                    'get' => [
                        'summary' => 'List content deliverables with optional filters',
                        'parameters' => [
                            ['name' => 'business_id', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer']],
                            ['name' => 'stage', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                            ['name' => 'type', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                        ],
                        'responses' => ['200' => ['description' => 'List of content items']],
                    ],
                    'post' => [
                        'summary' => 'Create a new content deliverable according to strategy (with optional tasks)',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['business_id', 'title'],
                                        'properties' => [
                                            'business_id' => ['type' => 'integer'],
                                            'title' => ['type' => 'string'],
                                            'type' => ['type' => 'string', 'enum' => ['reel', 'carousel', 'video', 'photo', 'story', 'post'], 'default' => 'reel'],
                                            'stage' => ['type' => 'string', 'enum' => ContentItem::STAGES, 'default' => 'idea'],
                                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high'], 'default' => 'medium'],
                                            'brief' => ['type' => 'string'],
                                            'hook' => ['type' => 'string'],
                                            'script' => ['type' => 'string'],
                                            'cta' => ['type' => 'string'],
                                            'target_audience' => ['type' => 'string'],
                                            'shoot_notes' => ['type' => 'string'],
                                            'thumbnail_url' => ['type' => 'string', 'description' => 'Cover image or poster URL for thumbnail preview'],
                                            'drive_folder_url' => ['type' => 'string', 'description' => 'Google Drive directory URL for shots of this content'],
                                            'raw_footage_url' => ['type' => 'string'],
                                            'final_asset_url' => ['type' => 'string'],
                                            'publish_at' => ['type' => 'string', 'format' => 'date-time'],
                                            'tasks' => [
                                                'type' => 'array',
                                                'description' => 'Optional array of tasks to define for this content immediately',
                                                'items' => [
                                                    'type' => 'object',
                                                    'required' => ['title'],
                                                    'properties' => [
                                                        'title' => ['type' => 'string'],
                                                        'type' => ['type' => 'string', 'enum' => ['content', 'editing', 'shoot', 'design', 'strategy', 'general']],
                                                        'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                                                        'due_at' => ['type' => 'string', 'format' => 'date-time'],
                                                        'estimate_minutes' => ['type' => 'integer'],
                                                    ],
                                                ],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['201' => ['description' => 'Content deliverable created']],
                    ],
                ],
                '/content/{id}' => [
                    'get' => [
                        'summary' => 'Get content deliverable by ID with sub-tasks and Drive links',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'responses' => ['200' => ['description' => 'Content item details']],
                    ],
                    'patch' => [
                        'summary' => 'Update content deliverable details, advance stage, or attach Drive shot directory',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'title' => ['type' => 'string'],
                                            'stage' => ['type' => 'string', 'enum' => ContentItem::STAGES],
                                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                                            'brief' => ['type' => 'string'],
                                            'hook' => ['type' => 'string'],
                                            'script' => ['type' => 'string'],
                                            'cta' => ['type' => 'string'],
                                            'shoot_notes' => ['type' => 'string'],
                                            'thumbnail_url' => ['type' => 'string', 'description' => 'Cover image or poster URL for thumbnail preview'],
                                            'drive_folder_url' => ['type' => 'string', 'description' => 'Google Drive directory URL for shots taken'],
                                            'raw_footage_url' => ['type' => 'string'],
                                            'final_asset_url' => ['type' => 'string', 'description' => 'Google Drive or cloud export URL when ready'],
                                            'publish_at' => ['type' => 'string', 'format' => 'date-time'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Content item updated']],
                    ],
                    'delete' => [
                        'summary' => 'Move content deliverable to Recycle Bin',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'responses' => ['200' => ['description' => 'Content item soft-deleted']],
                    ],
                ],
                '/tasks' => [
                    'get' => [
                        'summary' => 'List tasks with optional filters',
                        'parameters' => [
                            ['name' => 'business_id', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer']],
                            ['name' => 'content_item_id', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'integer']],
                            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                        ],
                        'responses' => ['200' => ['description' => 'List of tasks']],
                    ],
                    'post' => [
                        'summary' => 'Create a task for content or agency operations',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['title'],
                                        'properties' => [
                                            'title' => ['type' => 'string'],
                                            'business_id' => ['type' => 'integer', 'nullable' => true],
                                            'content_item_id' => ['type' => 'integer', 'nullable' => true],
                                            'description' => ['type' => 'string'],
                                            'type' => ['type' => 'string', 'enum' => ['content', 'editing', 'shoot', 'design', 'strategy', 'general']],
                                            'status' => ['type' => 'string', 'enum' => ['todo', 'in_progress', 'blocked', 'review', 'done']],
                                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                                            'due_at' => ['type' => 'string', 'format' => 'date-time'],
                                            'estimate_minutes' => ['type' => 'integer'],
                                            'owner_id' => ['type' => 'integer', 'nullable' => true],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['201' => ['description' => 'Task created']],
                    ],
                ],
                '/tasks/{id}' => [
                    'get' => [
                        'summary' => 'Get task details',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'responses' => ['200' => ['description' => 'Task details']],
                    ],
                    'patch' => [
                        'summary' => 'Update task status, progress, actual minutes, or details',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'title' => ['type' => 'string'],
                                            'status' => ['type' => 'string', 'enum' => ['todo', 'in_progress', 'blocked', 'review', 'done']],
                                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high']],
                                            'description' => ['type' => 'string'],
                                            'actual_minutes' => ['type' => 'integer'],
                                            'estimate_minutes' => ['type' => 'integer'],
                                            'due_at' => ['type' => 'string', 'format' => 'date-time'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Task updated']],
                    ],
                    'delete' => [
                        'summary' => 'Move task to Recycle Bin',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'responses' => ['200' => ['description' => 'Task soft-deleted']],
                    ],
                ],
                '/shoots' => [
                    'get' => [
                        'summary' => 'List shoot sessions',
                        'responses' => ['200' => ['description' => 'List of shoot sessions']],
                    ],
                    'post' => [
                        'summary' => 'Schedule a new shoot session with Google Drive shot folder',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['business_id', 'title', 'starts_at'],
                                        'properties' => [
                                            'business_id' => ['type' => 'integer'],
                                            'title' => ['type' => 'string'],
                                            'location' => ['type' => 'string'],
                                            'starts_at' => ['type' => 'string', 'format' => 'date-time'],
                                            'ends_at' => ['type' => 'string', 'format' => 'date-time'],
                                            'drive_folder_url' => ['type' => 'string', 'description' => 'Google Drive shot directory URL'],
                                            'notes' => ['type' => 'string'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['201' => ['description' => 'Shoot session scheduled']],
                    ],
                ],
                '/shoots/{id}' => [
                    'patch' => [
                        'summary' => 'Update shoot session status or attach Google Drive shots directory',
                        'parameters' => [['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']]],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'properties' => [
                                            'status' => ['type' => 'string', 'enum' => ['scheduled', 'completed', 'canceled']],
                                            'drive_folder_url' => ['type' => 'string', 'description' => 'Google Drive shot directory URL'],
                                            'notes' => ['type' => 'string'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Shoot session updated']],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }

    /**
     * Return Markdown guide formatted for LLM system prompts and agent setup.
     */
    public function guide(Request $request): Response
    {
        $baseUrl = url('/api/v1');

        $markdown = <<<MARKDOWN
# Lumink OS AI Agent Operating Manual

You are an AI Agent with direct authenticated access to Lumink OS (Agency Management System).
Base URL: `{$baseUrl}`
Authentication: Send `Authorization: Bearer <your_token>` on every request.

## Core Capabilities
1. **Explore Client Strategy**: Query client businesses to discover their monthly retainers, deliverable targets, and existing Drive folder structure.
   - `GET /businesses`: List businesses with deliverable targets and Google Drive root folder.
   - `GET /businesses/{id}`: View specific client details and current campaign plans.

2. **Plan Content Deliverables & Reuse Archive Footage**:
   - `GET /shoots?business_id={id}&tag={keyword}`: Search the client's B-roll archive first! If high-quality footage already exists from previous shoots, plan content around it to maximize production ROI.
   - `POST /content`: Create deliverable. Include `business_id`, `title`, `type` (`reel`, `carousel`, `video`, `photo`, `story`, `post`), `stage`, `brief`, `hook`, `script`, `cta`, `target_audience`, `publish_at`.
   - **Cross-Referencing Shoots**: Pass `primary_shoot_id` (the dedicated shoot) and `referenced_shoot_ids: [id1, id2]` (past shoots with reusable B-roll).
   - You can also supply a `tasks` array directly inside `POST /content` to create all sub-tasks in one request!

3. **Manage & Track Tasks**:
   - `POST /tasks`: Create individual task linked to a content item (`content_item_id`) or business (`business_id`).
   - `PATCH /tasks/{id}`: Update task status (`todo`, `in_progress`, `blocked`, `review`, `done`) and track `actual_minutes`.

4. **Connect Google Drive Shots & Media Assets**:
   - When a shoot is scheduled or shots are captured in Google Drive:
     - On the Shoot Session: `POST /shoots` automatically provisions `01_Raw_Footage/Shoots_Archive/YYYY-MM-DD_Title/` in Drive!
     - On the Content Item: `PATCH /content/{id}` with `primary_shoot_id` or `referenced_shoot_ids` so the editor has 1-click links to all necessary footage folders.
   - When the content is edited and ready:
     - `PATCH /content/{id}` with `final_asset_url` (link to the single exported review file in Drive) and set `stage: 'client_review'` or `'approved'`.

## Enums
- **Content Stages**: `idea`, `planned`, `scripted`, `shoot_scheduled`, `shot`, `editing`, `internal_review`, `client_review`, `approved`, `scheduled`, `published`
- **Content Types**: `reel`, `carousel`, `video`, `photo`, `story`, `post`
- **Task Types**: `content`, `editing`, `shoot`, `design`, `strategy`, `general`
- **Task Statuses**: `todo`, `in_progress`, `blocked`, `review`, `done`
- **Priorities**: `low`, `medium`, `high`

Machine-readable OpenAPI 3.0 spec is available at `GET /openapi.json`.
Full capabilities manifest is available at `GET /agent/capabilities`.
MARKDOWN;

        return response($markdown, 200, ['Content-Type' => 'text/markdown; charset=UTF-8']);
    }
}
