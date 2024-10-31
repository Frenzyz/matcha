import Model, { attr, belongsTo } from 'ember-data/model';

export default class ScholarshipEligibility extends Model {
  @attr('number') declare gpaMin: number;
  @attr() declare schoolLevels: string[];
  @attr() declare fieldsOfStudy: string[];
  @attr() declare citizenship: string[];
  @attr() declare states: string[];
  @attr() declare ethnicities: string[];
  @attr() declare militaryAffiliations: string[];
  @belongsTo('scholarship') declare scholarship: any;
}