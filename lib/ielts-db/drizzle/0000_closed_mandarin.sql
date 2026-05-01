CREATE TABLE "access_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_by_email" text,
	"used_at" timestamp with time zone,
	CONSTRAINT "access_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"password_hash" text,
	"access_code_id" integer,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "access_requests_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "activity_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"activity" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_positions_email_activity_unique" UNIQUE("email","activity")
);
--> statement-breakpoint
CREATE TABLE "admin_alerts_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"alert_key" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_alerts_sent_alert_key_unique" UNIQUE("alert_key")
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"route" text NOT NULL,
	"endpoint" text NOT NULL,
	"cost_usd" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"flashcard_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	CONSTRAINT "bookmarks_flashcard_id_email_unique" UNIQUE("flashcard_id","email")
);
--> statement-breakpoint
CREATE TABLE "card_srs" (
	"id" serial PRIMARY KEY NOT NULL,
	"flashcard_id" integer NOT NULL,
	"next_review_at" timestamp with time zone DEFAULT now() NOT NULL,
	"interval_days" real DEFAULT 1 NOT NULL,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	CONSTRAINT "card_srs_flashcard_id_email_unique" UNIQUE("flashcard_id","email")
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" serial PRIMARY KEY NOT NULL,
	"english" text NOT NULL,
	"arabic" text NOT NULL,
	"level" text NOT NULL,
	"category" text NOT NULL,
	"example_sentence" text,
	"example_sentence_arabic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"lesson_id" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_completions_email_lesson_id_unique" UNIQUE("email","lesson_id")
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" serial PRIMARY KEY NOT NULL,
	"course" text NOT NULL,
	"title" text NOT NULL,
	"vimeo_url" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_id" integer NOT NULL,
	"email" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_reads_notification_id_email_unique" UNIQUE("notification_id","email")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"audience" text DEFAULT 'all' NOT NULL,
	"level" text,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'admin' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orwell_coach_summaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"at_submission_count" integer NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orwell_coach_summaries_email_at_submission_count_unique" UNIQUE("email","at_submission_count")
);
--> statement-breakpoint
CREATE TABLE "orwell_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"assignment_id" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"band" real,
	"word_count" integer,
	"text" text,
	"feedback" text,
	"task_type_label" text,
	"prompt" text,
	"compare_report" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orwell_submissions_email_assignment_id_unique" UNIQUE("email","assignment_id")
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"flashcard_id" integer NOT NULL,
	"known" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"endpoint" text NOT NULL,
	"keys" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_email_endpoint_unique" UNIQUE("email","endpoint")
);
--> statement-breakpoint
CREATE TABLE "quiz_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"mode" text NOT NULL,
	"level" text NOT NULL,
	"total" integer NOT NULL,
	"correct" integer NOT NULL,
	"wrong" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"comment" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"admin_reply" text,
	"admin_reply_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sentence_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"level" text NOT NULL,
	"total_words" integer NOT NULL,
	"first_attempt_correct" integer DEFAULT 0 NOT NULL,
	"needed_correction" integer DEFAULT 0 NOT NULL,
	"avg_vocab_band" real DEFAULT 0 NOT NULL,
	"avg_grammar_band" real DEFAULT 0 NOT NULL,
	"common_mistakes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ended_early" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"title_arabic" text NOT NULL,
	"content" text NOT NULL,
	"content_arabic" text NOT NULL,
	"level" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_quizzes" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"questions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_quizzes_story_id_unique" UNIQUE("story_id")
);
--> statement-breakpoint
CREATE TABLE "user_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_data_email_key_unique" UNIQUE("email","key")
);
--> statement-breakpoint
CREATE TABLE "weak_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"flashcard_id" integer NOT NULL,
	"wrong_count" integer DEFAULT 1 NOT NULL,
	"last_wrong_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weak_words_email_flashcard_id_unique" UNIQUE("email","flashcard_id")
);
--> statement-breakpoint
CREATE TABLE "xp_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"activity" text NOT NULL,
	"xp" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_srs" ADD CONSTRAINT "card_srs_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_completions" ADD CONSTRAINT "lesson_completions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_quizzes" ADD CONSTRAINT "story_quizzes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weak_words" ADD CONSTRAINT "weak_words_flashcard_id_flashcards_id_fk" FOREIGN KEY ("flashcard_id") REFERENCES "public"."flashcards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "xp_events_email_activity_created_idx" ON "xp_events" USING btree ("email","activity","created_at");--> statement-breakpoint
CREATE INDEX "xp_events_email_created_idx" ON "xp_events" USING btree ("email","created_at");