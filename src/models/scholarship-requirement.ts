import Model, { attr, belongsTo } from 'ember-data/model';

export default class ScholarshipRequirement extends Model {
  @attr('string') declare title: string;
  @attr('string') declare description: string;
  @attr('string') declare type: 'text' | 'file' | 'link';
  @attr('boolean') declare required: boolean;
  @attr() declare config: any;
  @belongsTo('scholarship') declare scholarship: any;
}
