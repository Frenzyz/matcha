import Model, { attr, belongsTo } from 'ember-data/model';

export default class ScholarshipField extends Model {
  @attr('string') declare name: string;
  @attr('string') declare type: 'text' | 'email' | 'phone' | 'date' | 'option';
  @attr('boolean') declare required: boolean;
  @attr() declare options: Record<string, any>;
  @belongsTo('scholarship') declare scholarship: any;
}