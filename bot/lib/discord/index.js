
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Intents, MessageEmbed } = require('discord.js');
const EventEmitter = require('events');
const table = require('text-table');

const commands = [{
  name: 'ksk',
  description: 'Gets the current KSK list'
}];

class DiscordClient extends EventEmitter {

  constructor({
    clientId,
    botToken,
    siteClient,
    logger
  }) {
    super({});
    this.logger = logger.child({
      component: 'discord'
    });
    this.discord = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });
    this.clientId = clientId;
    this.botToken = botToken;
    this.siteClient = siteClient;

    this.restClient = new REST({ version: '9' }).setToken(botToken);

    this.discord.on('ready', () => {
      this.user = this.discord.user;
      this.logger.info('Discord client was logged in as user %s', this.user.tag);

      const guilds = this.discord.guilds.cache.map(guild => guild.id);
      this.logger.debug({ guilds }, 'Found bot to be a member of the following guilds');

      this.guilds = guilds;

      this.emit('ready');
    });

    this.discord.on('interactionCreate', async interaction => {
      if (!interaction.isCommand())
        return;

      switch (interaction.commandName) {
        case 'ksk':
          await this.runKskCommand(interaction);
          return;
      }
    });

    this.discord.on('messageCreate', async (message) => {
      this.logger.info({ channel: message.channel.name, }, 'Discord received a message');
      if (message.author.bot)
        return;

      if (message.channel.type === 'DM') {
        return;
      }

      if (message.content == null) {
        return;
      }

      const caseInsensitiveContent = message.content.toLowerCase();

      if (caseInsensitiveContent.includes('takis')) {
        await message.react('601169762092843010');
      }

      if (caseInsensitiveContent.includes('dew')) {
        await message.react('866472120099667979');
      }

    });

    this.discord.login(botToken);
  }

  async runKskCommand(interaction) {
    const embed = await getEmbed();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async getEmbed() {
    const resultingLists = await this.siteClient.getLists();
    const embed = new MessageEmbed();
    embed.setDescription(`Last updated ${resultingLists.date} ${resultingLists.time}`);

    const usersMap = {};

    for (let user of resultingLists.users) {
      usersMap[user.id] = user.n;
    }

    const fields = [];
    let fieldNum = 0;
    for (const list of resultingLists.lists) {
      // Build the table
      const tableColumns = [];

      let i = 0;
      for (const user of list.users) {
        i++;
        tableColumns.push([ i, usersMap[user] ]);
      }

      fields.push({
        name: list.n,
        value: '```' + table(tableColumns, { align: [ 'c', 'l' ], hsep: ' ' }) + '```',
        inline: true
      });

      fieldNum++;
    }

    embed.addFields(...fields);
    embed.addField('Links', '[Website Page](https://myamtech-io.github.io/dew-rage/lists)\n[API](https://myamtech-io.github.io/dew-rage/api/lists.json)');

    return embed;
  }

  async registerSlashCommands() {
    for (let guild of this.guilds) {
      this.logger.info('Registering slash command for guild %s', guild);
      await this.restClient.put(
        Routes.applicationGuildCommands(this.clientId, guild),
        { body: commands },
      );
    }
  }
}

module.exports = DiscordClient;
