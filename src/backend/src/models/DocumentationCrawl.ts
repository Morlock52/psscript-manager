import { Model, DataTypes, Sequelize } from 'sequelize';

export interface DocumentationCrawlAttributes {
  id?: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  pagesProcessed: number;
  totalPages?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DocumentationCrawl extends Model<DocumentationCrawlAttributes> implements DocumentationCrawlAttributes {
  public id!: string;
  public url!: string;
  public status!: 'pending' | 'running' | 'completed' | 'failed';
  public progress!: number;
  public pagesProcessed!: number;
  public totalPages?: number;
  public error?: string;
  public startedAt?: Date;
  public completedAt?: Date;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof DocumentationCrawl {
    DocumentationCrawl.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          isUrl: true
        }
      },
      status: {
        type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      pagesProcessed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      totalPages: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }
    }, {
      sequelize,
      modelName: 'DocumentationCrawl',
      tableName: 'documentation_crawls',
      timestamps: true
    });

    return DocumentationCrawl;
  }
}