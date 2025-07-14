-- Fix foreign key constraint to add CASCADE delete
-- First, drop the existing foreign key constraint
ALTER TABLE `flow_executions` DROP FOREIGN KEY `FK_bca57ea8523d9610d1b6ee80d0d`;

-- Then add the new constraint with CASCADE
ALTER TABLE `flow_executions` 
ADD CONSTRAINT `FK_bca57ea8523d9610d1b6ee80d0d` 
FOREIGN KEY (`flowId`) REFERENCES `flows` (`id`) 
ON DELETE CASCADE ON UPDATE NO ACTION;