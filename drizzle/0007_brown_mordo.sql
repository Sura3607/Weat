CREATE TABLE `post_reactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`foodLogId` int NOT NULL,
	`userId` int NOT NULL,
	`emoji` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_reactions_id` PRIMARY KEY(`id`)
);