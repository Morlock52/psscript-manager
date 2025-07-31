'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for common queries
    
    // Scripts table indexes
    await queryInterface.addIndex('scripts', ['user_id', 'category_id'], {
      name: 'idx_scripts_user_category'
    });
    
    await queryInterface.addIndex('scripts', ['category_id', 'created_at'], {
      name: 'idx_scripts_category_created'
    });
    
    await queryInterface.addIndex('scripts', ['is_public', 'created_at'], {
      name: 'idx_scripts_public_created'
    });
    
    await queryInterface.addIndex('scripts', ['file_hash', 'user_id'], {
      name: 'idx_scripts_hash_user'
    });
    
    // Script analysis table indexes
    await queryInterface.addIndex('script_analysis', ['script_id'], {
      name: 'idx_script_analysis_script_id',
      unique: true // One analysis per script
    });
    
    // Script tags junction table indexes (if not already present)
    await queryInterface.addIndex('script_tags', ['script_id', 'tag_id'], {
      name: 'idx_script_tags_script_tag',
      unique: true
    });
    
    await queryInterface.addIndex('script_tags', ['tag_id'], {
      name: 'idx_script_tags_tag'
    });
    
    // Users table indexes
    await queryInterface.addIndex('users', ['email'], {
      name: 'idx_users_email',
      unique: true
    });
    
    await queryInterface.addIndex('users', ['username'], {
      name: 'idx_users_username',
      unique: true
    });
    
    // Chat history indexes (if table exists)
    const tableNames = await queryInterface.showAllTables();
    if (tableNames.includes('chat_histories')) {
      await queryInterface.addIndex('chat_histories', ['user_id', 'created_at'], {
        name: 'idx_chat_history_user_created'
      });
    }
    
    // Script embeddings indexes (for vector search)
    if (tableNames.includes('script_embeddings')) {
      await queryInterface.addIndex('script_embeddings', ['script_id'], {
        name: 'idx_script_embeddings_script_id',
        unique: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes in reverse order
    await queryInterface.removeIndex('scripts', 'idx_scripts_user_category');
    await queryInterface.removeIndex('scripts', 'idx_scripts_category_created');
    await queryInterface.removeIndex('scripts', 'idx_scripts_public_created');
    await queryInterface.removeIndex('scripts', 'idx_scripts_hash_user');
    await queryInterface.removeIndex('script_analysis', 'idx_script_analysis_script_id');
    await queryInterface.removeIndex('script_tags', 'idx_script_tags_script_tag');
    await queryInterface.removeIndex('script_tags', 'idx_script_tags_tag');
    await queryInterface.removeIndex('users', 'idx_users_email');
    await queryInterface.removeIndex('users', 'idx_users_username');
    
    // Conditional removals
    const tableNames = await queryInterface.showAllTables();
    if (tableNames.includes('chat_histories')) {
      await queryInterface.removeIndex('chat_histories', 'idx_chat_history_user_created');
    }
    if (tableNames.includes('script_embeddings')) {
      await queryInterface.removeIndex('script_embeddings', 'idx_script_embeddings_script_id');
    }
  }
};