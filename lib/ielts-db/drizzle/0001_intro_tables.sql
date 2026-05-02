CREATE TABLE "intro_access_codes" (
	"code" varchar(64) PRIMARY KEY NOT NULL,
	"used_by" varchar(255),
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "intro_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_essay_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"task_type" varchar(20) NOT NULL,
	"essay" text NOT NULL,
	"overall_band" real,
	"task_response_band" real,
	"coherence_band" real,
	"lexical_band" real,
	"grammar_band" real,
	"analysis" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_listening_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"test_id" varchar(64) NOT NULL,
	"section_id" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"percent" real NOT NULL,
	"results" jsonb NOT NULL,
	"analysis" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_listening_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"section_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"transcript" jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"answer_key" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_reading_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"item_slug" varchar(64) NOT NULL,
	"level" varchar(8) NOT NULL,
	"type" varchar(32) NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"percent" real NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_reading_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(64) NOT NULL,
	"level" varchar(8) NOT NULL,
	"type" varchar(32) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"title" varchar(255) NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"passage" text DEFAULT '' NOT NULL,
	"paragraphs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"questions" jsonb NOT NULL,
	"answer_key" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intro_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"password" varchar(255),
	"access_code" varchar(64),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "intro_students_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "intro_essay_logs" ADD CONSTRAINT "intro_essay_logs_student_id_intro_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."intro_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_listening_attempts" ADD CONSTRAINT "intro_listening_attempts_student_id_intro_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."intro_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_messages" ADD CONSTRAINT "intro_messages_conversation_id_intro_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."intro_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intro_reading_attempts" ADD CONSTRAINT "intro_reading_attempts_student_id_intro_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."intro_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listening_attempts_student_test_uniq" ON "intro_listening_attempts" USING btree ("student_id","test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listening_tests_slug_uniq" ON "intro_listening_tests" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_attempts_student_item_uniq" ON "intro_reading_attempts" USING btree ("student_id","item_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_items_slug_uniq" ON "intro_reading_items" USING btree ("slug");