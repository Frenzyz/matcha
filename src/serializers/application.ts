import JSONAPISerializer from 'ember-data/serializers/json-api';

export default class ApplicationSerializer extends JSONAPISerializer {
  // Customize the serializer if needed
  keyForAttribute(key: string) {
    return key.replace(/([A-Z])/g, '_$1').toLowerCase();
  }
}
