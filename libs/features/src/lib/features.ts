import { Document, Model, PopulateOptions, Query } from 'mongoose';
import QueryString, { ParsedQs } from 'qs';

type AllowedQueryKeys =
  | 'page'
  | 'limit'
  | 'sort'
  | 'fields'
  | 'search'
  | 'populate';

export interface QueryParams
  extends Partial<Record<AllowedQueryKeys, string>>,
    Record<
      string,
      | string
      | string[]
      | ParsedQs
      | ParsedQs[]
      | (string | ParsedQs)[]
      | undefined
    > {}

export class APIFeatures<T extends Document> {
  private query: Query<T[], T>;
  private queryString: QueryString.ParsedQs;

  constructor(model: Model<T>, queryString: QueryString.ParsedQs) {
    this.query = model.find();
    this.queryString = queryString;
  }

  public filter(): this {
    const queryObj: Record<string, unknown> = { ...this.queryString };
    const excludeFields: AllowedQueryKeys[] = [
      'page',
      'sort',
      'limit',
      'fields',
      'search',
      'populate',
    ];
    excludeFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(
      /\b(eq|ne|gt|gte|lt|lte|in|nin|regex|exists|all|size|elemMatch|type|mod|not|and|or|nor|text|where|geoWithin|geoIntersects|near|nearSphere|expr|jsonSchema|bitsAllClear|bitsAllSet|bitsAnyClear|bitsAnySet|rand)\b/g,
      (match) => `$${match}`
    );

    const parsed = JSON.parse(queryStr);

    Object.keys(parsed).forEach((key) => {
      if (parsed[key] === 'true') {
        parsed[key] = true;
      } else if (parsed[key] === 'false') {
        parsed[key] = false;
      } else if (
        typeof parsed[key] === 'string' &&
        !/^[0-9a-fA-F]{24}$/.test(parsed[key])
      ) {
        parsed[key] = { $regex: parsed[key], $options: 'i' };
      }
    });

    console.log(parsed);

    this.query = this.query.find(parsed);
    return this;
  }

  public sort(sortString = '-createdAt'): this {
    if (this.queryString.sort) {
      this.query = this.query.sort(
        String(this.queryString.sort).split(',').join(' ')
      );
    } else {
      this.query = this.query.sort(sortString);
    }
    return this;
  }

  public limitFields(fields?: string): this {
    if (fields) {
      this.query = this.query.select(fields.split(',').join(' '));
    } else if (this.queryString.fields) {
      this.query = this.query.select(
        String(this.queryString.fields).split(',').join(' ')
      );
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  public paginate(): this {
    const page = parseInt(String(this.queryString.page ?? '1'), 10) || 1;
    const limit = parseInt(String(this.queryString.limit ?? '10'), 10) || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  public globalSearch(fields: string[]): this {
    if (this.queryString.search) {
      const regex = new RegExp(String(this.queryString.search), 'i');
      const conditions = fields.map((f) => ({ [f]: regex }));
      this.query = this.query.find({
        ...this.query.getFilter(),
        $or: conditions,
      });
    }
    return this;
  }

  public populate(options?: PopulateOptions | PopulateOptions[]): this {
    if (options) {
      this.query = this.query.populate(options);
    } else if (typeof this.queryString.populate === 'string') {
      this.queryString.populate
        .split(',')
        .map((p) => p.trim())
        .forEach((path) => {
          this.query = this.query.populate({ path });
        });
    }
    return this;
  }

  public async exec(): Promise<{ data: T[]; total: number }> {
    const [data, total] = await Promise.all([
      this.query.exec(),
      this.query.model.countDocuments(this.query.getFilter()),
    ]);
    return { data, total };
  }

  public getQuery(): Query<T[], T> {
    return this.query;
  }
}
