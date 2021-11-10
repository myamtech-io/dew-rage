
const axios = require('axios');

class SiteClient {

  constructor({ baseUrl, logger }) {
    this.logger = logger.child({ component: 'http' });
    this.baseUrl = baseUrl.trimEnd('/');
  }

  async getLists() {
    this.logger.debug('Fetching list information from site');
    const result = await axios.get(
      this.baseUrl + '/lists.json'
    );
    this.logger.debug('Loaded data from site - last modified date: %s', result.data.date);
    return result.data;
  }

}


module.exports = SiteClient;
