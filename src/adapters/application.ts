import JSONAPIAdapter from 'ember-data/adapters/json-api';

export default class ApplicationAdapter extends JSONAPIAdapter {
  host = 'https://api.scholarships.com';
  namespace = 'v1';

  get headers() {
    return {
      'SCHOLARSHIP-APP-API-Key': import.meta.env.VITE_SCHOLARSHIP_API_KEY,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json'
    };
  }
}