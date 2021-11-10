
const axios = require('axios');

class SiteClient {

  constructor({ baseUrl, logger }) {
    this.logger = logger.child({ component: 'http' });
    this.baseUrl = baseUrl.trimEnd('/');
  }

  async getLists() {
    this.logger.debug('Fetching list information from site');
    const result = await axios.get(
      this.getListsApiUrl()
    );
    this.logger.debug('Loaded data from site - last modified date: %s', result.data.date);
    return result.data;
  }

  getListWebpageUrl() {
    return this.baseUrl + '/lists';
  }

  getListsApiUrl() {
    return this.baseUrl + '/api/lists.json';
  }

}


module.exports = SiteClient;
