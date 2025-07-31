import { Model, DataTypes, Sequelize } from 'sequelize';

export interface DocumentationItemAttributes {
  id?: string;
  title: string;
  url: string;
  content: string;
  source: string;
  tags: string[];
  crawledAt?: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

export class DocumentationItem extends Model<DocumentationItemAttributes> implements DocumentationItemAttributes {
  public id!: string;
  public title!: string;
  public url!: string;
  public content!: string;
  public source!: string;
  public tags!: string[];
  public crawledAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof DocumentationItem {
    DocumentationItem.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 200]
        }
      },
      url: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        validate: {
          isUrl: true
        }
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      source: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false
      },
      crawledAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      sequelize,
      modelName: 'DocumentationItem',
      tableName: 'documentation_items',
      timestamps: true,
      indexes: [
        {
          fields: ['source']
        },
        {
          fields: ['tags'],
          using: 'GIN'
        },
        {
          type: 'FULLTEXT',
          fields: ['title', 'content']
        }
      ]
    });

    return DocumentationItem;
  }
}