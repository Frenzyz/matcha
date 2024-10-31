import Model, { attr, hasMany, belongsTo } from 'ember-data/model';

export default class Scholarship extends Model {
  @attr('string') declare title: string;
  @attr('string') declare description: string;
  @attr('number') declare amount: number;
  @attr('date') declare deadline: Date;
  @hasMany('scholarship-requirement') declare requirements: any[];
  @hasMany('scholarship-field') declare fields: any[];
  @belongsTo('scholarship-eligibility') declare eligibility: any;
  @attr('string') declare url: string;
  @attr('string') declare provider: string;
  @attr('date') declare createdAt: Date;
  @attr('date') declare updatedAt: Date;
}