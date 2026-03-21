CREATE TABLE `check_ins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`latitude` float NOT NULL,
	`longitude` float NOT NULL,
	`locationName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `check_ins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`dishName` varchar(255),
	`dishNameVi` varchar(255),
	`category` varchar(100),
	`ingredients` json,
	`calories` int,
	`tags` json,
	`aiAnalysis` json,
	`latitude` float,
	`longitude` float,
	`locationName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`friendId` int NOT NULL,
	`status` enum('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`receiverId` int NOT NULL,
	`senderCraving` varchar(255),
	`status` enum('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
	`venueName` varchar(255),
	`venueAddress` text,
	`venueLat` float,
	`venueLng` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `match_invites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `foodDna` json;--> statement-breakpoint
ALTER TABLE `users` ADD `latitude` float;--> statement-breakpoint
ALTER TABLE `users` ADD `longitude` float;--> statement-breakpoint
ALTER TABLE `users` ADD `locationUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `currentCraving` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `cravingUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `isRadarActive` boolean DEFAULT false;