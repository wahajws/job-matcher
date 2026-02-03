export abstract class BaseService {
  protected abstract model: any;

  async findById(id: string): Promise<any> {
    return this.model.findByPk(id);
  }

  async findAll(filters?: any): Promise<any[]> {
    return this.model.findAll(filters);
  }

  async create(data: any): Promise<any> {
    return this.model.create(data);
  }

  async update(id: string, data: any): Promise<any> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error('Record not found');
    }
    await record.update(data);
    return record;
  }

  async delete(id: string): Promise<void> {
    const record = await this.findById(id);
    if (!record) {
      throw new Error('Record not found');
    }
    await record.destroy();
  }
}
