import { Model, DataTypes, ModelStatic, ModelAttributes, ModelOptions } from 'sequelize';
import sequelize from '../config.js';

export abstract class BaseModel<T extends Model = Model> extends Model<T> {
  // Common methods can be added here
  static async findById<T extends BaseModel>(this: ModelStatic<T>, id: string): Promise<T | null> {
    return this.findByPk(id);
  }

  static async findAllActive<T extends BaseModel>(this: ModelStatic<T>): Promise<T[]> {
    return this.findAll() as Promise<T[]>;
  }
}
