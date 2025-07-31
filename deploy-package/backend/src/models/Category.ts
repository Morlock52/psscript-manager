import { Model, DataTypes, Sequelize } from 'sequelize';
import Script from './Script';

export default class Category extends Model {
  public id!: number;
  public name!: string;
  public description!: string;
  
  public readonly createdAt!: Date;

  // References
  public readonly scripts?: Script[];

  static initialize(sequelize: Sequelize) {
    Category.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      sequelize,
      tableName: 'categories',
      underscored: true,
      timestamps: false
    });
  }

  static associate() {
    Category.hasMany(Script, { foreignKey: 'categoryId', as: 'scripts' });
  }
}
