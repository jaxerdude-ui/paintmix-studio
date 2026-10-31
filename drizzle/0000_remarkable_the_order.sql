CREATE TABLE `paintmix_records` (
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner_id`, `kind`, `id`)
);
