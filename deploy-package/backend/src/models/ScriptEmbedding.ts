import { Model, DataTypes, Sequelize } from 'sequelize';
import Script from './Script';

export default class ScriptEmbedding extends Model {
  public id!: number;
  public scriptId!: number;
  public embedding!: number[];
  public embeddingType!: string;
  public modelVersion!: string;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // References
  public readonly script?: Script;

  static initialize(sequelize: Sequelize) {
    ScriptEmbedding.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      scriptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'scripts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      embedding: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: false
      },
      embeddingType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'openai' // 'openai', 'huggingface', etc.
      },
      modelVersion: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'text-embedding-ada-002'
      }
    }, {
      sequelize,
      tableName: 'script_embeddings',
      indexes: [
        {
          unique: true,
          fields: ['scriptId', 'embeddingType', 'modelVersion']
        }
      ]
    });
  }

  static associate() {
    ScriptEmbedding.belongsTo(Script, { foreignKey: 'scriptId', as: 'script' });
  }
}