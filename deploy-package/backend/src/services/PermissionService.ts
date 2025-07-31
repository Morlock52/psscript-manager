import { sequelize } from '../database/connection';
import logger from '../utils/logger';
import { LRUCache } from 'lru-cache';

interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
}

interface UserPermissions {
  userId: number;
  role: string;
  permissions: string[];
}

/**
 * Service for managing role-based permissions
 */
export class PermissionService {
  private static permissionCache = new LRUCache<string, UserPermissions>({
    max: 1000,
    ttl: 5 * 60 * 1000 // 5 minutes
  });

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(
    userId: number,
    permissionName: string
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return userPermissions.permissions.includes(permissionName);
    } catch (error) {
      logger.error('Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Check if user has all specified permissions
   */
  static async hasAllPermissions(
    userId: number,
    permissionNames: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.every(perm => 
        userPermissions.permissions.includes(perm)
      );
    } catch (error) {
      logger.error('Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Check if user has any of the specified permissions
   */
  static async hasAnyPermission(
    userId: number,
    permissionNames: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      return permissionNames.some(perm => 
        userPermissions.permissions.includes(perm)
      );
    } catch (error) {
      logger.error('Failed to check permissions:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: number): Promise<UserPermissions> {
    const cacheKey = `user_${userId}`;
    const cached = this.permissionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Get user's role
      const [user] = await sequelize.query(
        `SELECT role FROM users WHERE id = :userId`,
        {
          replacements: { userId },
          type: 'SELECT'
        }
      ) as any[];

      if (!user) {
        throw new Error('User not found');
      }

      // Get role permissions
      const rolePermissions = await sequelize.query(
        `SELECT p.name 
         FROM permissions p 
         JOIN role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role = :role`,
        {
          replacements: { role: user.role },
          type: 'SELECT'
        }
      ) as any[];

      // Get user-specific permissions
      const userPermissions = await sequelize.query(
        `SELECT p.name, up.granted 
         FROM permissions p 
         JOIN user_permissions up ON p.id = up.permission_id 
         WHERE up.user_id = :userId`,
        {
          replacements: { userId },
          type: 'SELECT'
        }
      ) as any[];

      // Combine permissions
      const allPermissions = new Set<string>();

      // Add role permissions
      rolePermissions.forEach(p => allPermissions.add(p.name));

      // Add/remove user-specific permissions
      userPermissions.forEach(p => {
        if (p.granted) {
          allPermissions.add(p.name);
        } else {
          allPermissions.delete(p.name);
        }
      });

      const result: UserPermissions = {
        userId,
        role: user.role,
        permissions: Array.from(allPermissions)
      };

      this.permissionCache.set(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Failed to get user permissions:', error);
      return {
        userId,
        role: 'user',
        permissions: []
      };
    }
  }

  /**
   * Grant a permission to a user
   */
  static async grantPermission(
    userId: number,
    permissionName: string
  ): Promise<void> {
    try {
      // Get permission ID
      const [permission] = await sequelize.query(
        `SELECT id FROM permissions WHERE name = :name`,
        {
          replacements: { name: permissionName },
          type: 'SELECT'
        }
      ) as any[];

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      // Grant permission
      await sequelize.query(
        `INSERT INTO user_permissions (user_id, permission_id, granted) 
         VALUES (:userId, :permissionId, true) 
         ON CONFLICT (user_id, permission_id) 
         DO UPDATE SET granted = true`,
        {
          replacements: {
            userId,
            permissionId: permission.id
          }
        }
      );

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Permission granted', {
        userId,
        permission: permissionName
      });

    } catch (error) {
      logger.error('Failed to grant permission:', error);
      throw error;
    }
  }

  /**
   * Revoke a permission from a user
   */
  static async revokePermission(
    userId: number,
    permissionName: string
  ): Promise<void> {
    try {
      // Get permission ID
      const [permission] = await sequelize.query(
        `SELECT id FROM permissions WHERE name = :name`,
        {
          replacements: { name: permissionName },
          type: 'SELECT'
        }
      ) as any[];

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      // Revoke permission
      await sequelize.query(
        `INSERT INTO user_permissions (user_id, permission_id, granted) 
         VALUES (:userId, :permissionId, false) 
         ON CONFLICT (user_id, permission_id) 
         DO UPDATE SET granted = false`,
        {
          replacements: {
            userId,
            permissionId: permission.id
          }
        }
      );

      // Clear cache
      this.clearUserCache(userId);

      logger.info('Permission revoked', {
        userId,
        permission: permissionName
      });

    } catch (error) {
      logger.error('Failed to revoke permission:', error);
      throw error;
    }
  }

  /**
   * Get all available permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const permissions = await sequelize.query(
        `SELECT id, name, description, resource, action 
         FROM permissions 
         ORDER BY resource, action`,
        { type: 'SELECT' }
      ) as any[];

      return permissions;
    } catch (error) {
      logger.error('Failed to get all permissions:', error);
      return [];
    }
  }

  /**
   * Get permissions for a role
   */
  static async getRolePermissions(role: string): Promise<string[]> {
    try {
      const permissions = await sequelize.query(
        `SELECT p.name 
         FROM permissions p 
         JOIN role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role = :role`,
        {
          replacements: { role },
          type: 'SELECT'
        }
      ) as any[];

      return permissions.map(p => p.name);
    } catch (error) {
      logger.error('Failed to get role permissions:', error);
      return [];
    }
  }

  /**
   * Add permission to role
   */
  static async addPermissionToRole(
    role: string,
    permissionName: string
  ): Promise<void> {
    try {
      // Get permission ID
      const [permission] = await sequelize.query(
        `SELECT id FROM permissions WHERE name = :name`,
        {
          replacements: { name: permissionName },
          type: 'SELECT'
        }
      ) as any[];

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      // Add to role
      await sequelize.query(
        `INSERT INTO role_permissions (role, permission_id) 
         VALUES (:role, :permissionId) 
         ON CONFLICT DO NOTHING`,
        {
          replacements: {
            role,
            permissionId: permission.id
          }
        }
      );

      // Clear cache for all users with this role
      this.clearRoleCache(role);

      logger.info('Permission added to role', {
        role,
        permission: permissionName
      });

    } catch (error) {
      logger.error('Failed to add permission to role:', error);
      throw error;
    }
  }

  /**
   * Remove permission from role
   */
  static async removePermissionFromRole(
    role: string,
    permissionName: string
  ): Promise<void> {
    try {
      // Get permission ID
      const [permission] = await sequelize.query(
        `SELECT id FROM permissions WHERE name = :name`,
        {
          replacements: { name: permissionName },
          type: 'SELECT'
        }
      ) as any[];

      if (!permission) {
        throw new Error(`Permission '${permissionName}' not found`);
      }

      // Remove from role
      await sequelize.query(
        `DELETE FROM role_permissions 
         WHERE role = :role AND permission_id = :permissionId`,
        {
          replacements: {
            role,
            permissionId: permission.id
          }
        }
      );

      // Clear cache for all users with this role
      this.clearRoleCache(role);

      logger.info('Permission removed from role', {
        role,
        permission: permissionName
      });

    } catch (error) {
      logger.error('Failed to remove permission from role:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific user
   */
  private static clearUserCache(userId: number): void {
    const cacheKey = `user_${userId}`;
    this.permissionCache.delete(cacheKey);
  }

  /**
   * Clear cache for all users with a specific role
   */
  private static async clearRoleCache(role: string): Promise<void> {
    try {
      const users = await sequelize.query(
        `SELECT id FROM users WHERE role = :role`,
        {
          replacements: { role },
          type: 'SELECT'
        }
      ) as any[];

      users.forEach(user => {
        this.clearUserCache(user.id);
      });
    } catch (error) {
      logger.error('Failed to clear role cache:', error);
    }
  }

  /**
   * Clear entire permission cache
   */
  static clearCache(): void {
    this.permissionCache.clear();
  }
}

export default PermissionService;