
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Intents, Permissions, MessageEmbed } = require('discord.js');
const EventEmitter = require('events');
const table = require('text-table');

const commands = [{
  name: 'ksk',
  description: 'Gets the current KSK list'
}, {
  name: 'purge',
  description: 'Purges users without a role'
}];

function isAThankYou(text) {
  return text.includes('ty') || text.includes('thx') || text.includes('thanks') || text.includes('thank you');
}

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
    this.discord = new Client({ intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
      Intents.FLAGS.GUILD_MEMBERS
    ] });
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

      try {
        switch (interaction.commandName) {
          case 'ksk':
            await this.runKskCommand(interaction);
            return;
          case 'purge':
            await this.runPurgeCommand(interaction);
            return;
        }
      } catch (e) {
        this.logger.error(e, 'Failed to run command: ' + interaction.commandName);
        await interaction.reply({ content: e.message, ephemeral: true });
      }
    });

    this.discord.on('messageCreate', async (message) => {
      this.logger.info({ channel: message.channel.name, author:message.author.username }, 'Discord received a message');
      const bel = "333022869862744085";

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

      if (
        message.author.id == bel &&
        isAThankYou(caseInsensitiveContent)
      ) {
        await message.reply('yw');
      }
    });

    this.discord.login(botToken);
  }

  async runKskCommand(interaction) {
    const embed = await this.getEmbed();

    this.logger.info({ author: interaction.member.user.username }, '/ksk command has been run');

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async runPurgeCommand(interaction) {
    if (!interaction.member.permissions.has(Permissions.FLAGS.KICK_MEMBERS)) {
      await interaction.reply({ content: 'You do not have permission', ephemeral: true });
      return;
    }

    const maxPurgeCount = 20;
    const embed = new MessageEmbed();
    embed.setDescription(`Members to purge`);

    this.logger.info({ author: interaction.member.user.username }, '/purge command has been run');

    const guild = interaction.guild;
    const members = await guild.members.fetch();

    const usersToPurge = [];
    const usersNotToPurge = [];

    members.forEach(m => {
      if (m._roles == null || m._roles.length === 0) {
        usersToPurge.push({ id: m.id, name: m.user.username, m });
        this.logger.debug('Kicking user: ' + m.user.username);
      } else {
        usersNotToPurge.push({ id: m.id, name: m.user.username, m });
        this.logger.debug('Not kicking ' + m.user.username);
      }
    });

    usersToPurge.sort(x => x.id).slice(0, maxPurgeCount);
    const fields = [];
    const tableColumns = [];

    for (const user of usersNotToPurge.slice(0, maxPurgeCount)) {
      tableColumns.push([ user.id, user.name ]);
    }

    fields.push({
      name: 'Users',
      value: '```' + table(tableColumns, { align: [ 'l', 'l' ], hsep: ' ' }) + '```',
      inline: true
    });

    embed.addFields(...fields);

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
