-- Migration: Add ON DELETE CASCADE constraints to script-related tables
-- This migration enhances data integrity by ensuring that when a script is deleted,
-- all related data in dependent tables is automatically deleted as well.

-- Function to get constraint name
CREATE OR REPLACE FUNCTION get_fk_constraint_name(target_table text, target_column text)
RETURNS text AS $$
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = target_table
      AND kcu.column_name = target_column;
    
    RETURN constraint_name;
END;
$$ LANGUAGE plpgsql;

-- Script versions table
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_versions', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_versions DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_versions ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_versions', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_versions.script_id';
    END IF;
END $$;

-- Script tags relation
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_tags', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_tags DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_tags ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_tags', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_tags.script_id';
    END IF;
END $$;

-- AI Analysis table
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_analysis', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_analysis DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_analysis ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_analysis', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_analysis.script_id';
    END IF;
END $$;

-- Vector embeddings table
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_embeddings', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_embeddings DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_embeddings ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_embeddings', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_embeddings.script_id';
    END IF;
END $$;

-- Script dependencies - parent_script_id
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_dependencies', 'parent_script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_dependencies DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_dependencies ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (parent_script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_dependencies (parent)', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_dependencies.parent_script_id';
    END IF;
END $$;

-- Script dependencies - child_script_id
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('script_dependencies', 'child_script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE script_dependencies DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE script_dependencies ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (child_script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on script_dependencies (child)', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for script_dependencies.child_script_id';
    END IF;
END $$;

-- Script execution logs
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('execution_logs', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE execution_logs DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE execution_logs ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on execution_logs', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for execution_logs.script_id';
    END IF;
END $$;

-- User favorites
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('user_favorites', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE user_favorites DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE user_favorites ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on user_favorites', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for user_favorites.script_id';
    END IF;
END $$;

-- Comments
DO $$
DECLARE
    constraint_name text;
BEGIN
    constraint_name := get_fk_constraint_name('comments', 'script_id');
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE comments DROP CONSTRAINT ' || constraint_name;
        EXECUTE 'ALTER TABLE comments ADD CONSTRAINT ' || constraint_name || 
                ' FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE';
        RAISE NOTICE 'Updated constraint % on comments', constraint_name;
    ELSE
        RAISE NOTICE 'No constraint found for comments.script_id';
    END IF;
END $$;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS get_fk_constraint_name(text, text);

-- Add a record to the migrations table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'migrations') THEN
        INSERT INTO migrations (name, applied_at) 
        VALUES ('07_add_cascade_delete_constraints', NOW());
    END IF;
END $$;
