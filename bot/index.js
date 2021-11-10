const { Command } = require('commander');
const nconf = require('nconf');
const bunyan = require('bunyan');
const pkg = require('./package.json');
const pathUtil = require('path');
const SiteClient = require('./lib/site');
const DiscordClient = require('./lib/discord');

const logger = bunyan.createLogger({
  name: pkg.name
});

const requiredConfig = [
  'discord:clientId',
  'discord:botToken',
  'website:apiUrl'
]

const program = new Command();

program
  .version(pkg.version)
  .option('-d, --debug', 'output extra debugging')
  .option('-c, --config <file>', 'Config file to load', pathUtil.join(__dirname, 'defaults.json'))
  .action(main);

program.parse(process.argv);

async function main(commandLineArgs) {
  if (commandLineArgs.config) {
    nconf
      .file('config', commandLineArgs.config);
  }

  nconf.file('locals', pathUtil.join(__dirname, 'locals.json'));

  nconf.overrides(commandLineArgs);

  try {
    // Now the nconf object should be sufficiently created
    nconf.required(requiredConfig);
  } catch (err) {
    logger.error(err, 'Failed to validate provided configuration');
    process.exitCode = 1;
    return;
  }

  const websiteBaseUrl = nconf.get('website:apiUrl');

  const siteClient = new SiteClient({
    baseUrl: websiteBaseUrl,
    logger
  });

  const botToken = nconf.get('discord:botToken');
  const clientId = nconf.get('discord:clientId');

  const discordClient = new DiscordClient({
    clientId,
    botToken,
    logger,
    siteClient
  });

  await runBot(discordClient, siteClient, logger);
}

async function runBot(discordClient, websiteClient, logger) {
  discordClient.on('ready', async () => {
    await discordClient.registerSlashCommands();
  });
}
