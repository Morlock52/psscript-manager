import { Model, DataTypes, Sequelize } from 'sequelize';
import Script from './Script';
import ScriptTag from './ScriptTag';

export default class Tag extends Model {
  public id!: number;
  public name!: string;
  
  public readonly createdAt!: Date;

  // References
  public readonly scripts?: Script[];

  static initialize(sequelize: Sequelize) {
    Tag.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      }
    }, {
      sequelize,
      tableName: 'tags',
      underscored: true
    });
  }

  static associate() {
    Tag.belongsToMany(Script, { 
      through: ScriptTag,
      foreignKey: 'tag_id',
      otherKey: 'script_id',
      as: 'scripts'
    });
  }
}
